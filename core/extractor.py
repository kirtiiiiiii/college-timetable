import re
from datetime import time
from core.detector import StructureDetector

class TimetableExtractor:
    SUBJECT_PATTERN = re.compile(r"([A-Z]{2,5}\d{3})([LPT])", re.IGNORECASE)
    
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    TIME_STRING = re.compile(r"^\s*(\d{1,2})\s*:\s*(\d{2})\s*:?\s*(AM|PM)?\s*$", re.IGNORECASE)
    TYPE_MAP = {"L": "Lecture", "P": "Practical", "T": "Tutorial"}

    def __init__(self, workbook, batch_index):
        self.workbook = workbook
        self.batch_index = batch_index
        self._hours_column_cache = {}

    def parse_subject(self, value):
        if value is None:
            return None
        text = str(value).strip().upper()
        matches = list(self.SUBJECT_PATTERN.finditer(text))
        if not matches:
            return None

        results = []
        for m in matches:
            base_code = m.group(1).upper()
            type_char = m.group(2).upper()
            results.append({
                "base_code": base_code,
                "code": base_code,
                "type": self.TYPE_MAP.get(type_char, "Lecture")
            })

        return results[0] if len(results) == 1 else results

    def normalize_time(self, value):
        if value is None:
            return None
        if isinstance(value, time):
            # If Excel stored time without date, convert late afternoon hours if needed
            return value

        text = str(value).strip()
        m = self.TIME_STRING.match(text)
        if not m:
            return None

        hour = int(m.group(1))
        minute = int(m.group(2))
        meridiem = m.group(3)

        if meridiem:
            meridiem = meridiem.upper()
            if meridiem == "PM" and hour != 12:
                hour += 12
            elif meridiem == "AM" and hour == 12:
                hour = 0
        else:
            # Handle 12-hour formatted strings missing AM/PM designation (e.g. 5:10 -> 17:10)
            if 1 <= hour <= 6:
                hour += 12

        return time(hour, minute) if hour <= 23 and minute <= 59 else None

    def get_hours_column(self, sheet):
        if sheet.title not in self._hours_column_cache:
            detector = StructureDetector(sheet)
            self._hours_column_cache[sheet.title] = detector.find_hours_column()
        return self._hours_column_cache[sheet.title]

    def format_time_str(self, t_obj):
        # Outputs "05:10 PM"
        return t_obj.strftime("%I:%M %p")

    def find_day_blocks(self, sheet, hours_column):
        detector = StructureDetector(sheet)
        starts = []
        last_minutes = 9999

        for row in range(1, sheet.max_row + 1):
            val = detector.get_cell_value(row, hours_column)
            t = self.normalize_time(val)
            if t is not None:
                current_minutes = t.hour * 60 + t.minute
                if current_minutes < last_minutes:
                    starts.append(row)
                last_minutes = current_minutes

        blocks = []
        for i, start in enumerate(starts):
            if i >= len(self.DAYS):
                break
            # Ensure block end captures row offsets all the way to 5:10 PM slot
            if i < len(starts) - 1:
                end = starts[i + 1] - 1
            else:
                end = min(start + 30, sheet.max_row) # Ensures last day (Saturday) isn't truncated
            blocks.append({"day": self.DAYS[i], "start": start, "end": end})

        return blocks

    def get_details(self, sheet, row, column, block_end, hours_column):
        detector = StructureDetector(sheet)
        sub_info = []
        
        # Collect details across 4 sub-rows below subject start row
        for offset in range(1, 4):
            current_row = row + offset
            if current_row > block_end:
                break

            cell_val = detector.get_cell_value(current_row, column)
            if cell_val is None:
                continue

            text = str(cell_val).strip()

            # Stop if a new subject starts
            if self.parse_subject(text):
                break

            text_upper = text.upper()
            if text_upper in ["DAY", "HOURS", "SR NO", "SR.NO", "LAB"]:
                continue

            if text not in sub_info:
                sub_info.append(text)

        return " • ".join(sub_info) if sub_info else ""

    def format_time_str(self, t_obj):
        # Always format time with leading zeros, e.g. "08:00 AM" or "05:10 PM"
        return t_obj.strftime("%I:%M %p")

    def extract(self, batch, selected_electives=None):
        if selected_electives is None:
            selected_electives = []

        info = self.batch_index[batch]
        sheet = self.workbook[info["sheet"]]
        detector = StructureDetector(sheet)
        column = info["column"]

        hours_column = self.get_hours_column(sheet)
        timetable = {}
        day_blocks = self.find_day_blocks(sheet, hours_column)
        all_elective_options = set()

        for block in day_blocks:
            lectures = []
            
            # Get list of all valid time slot rows in this day
            time_rows = []
            for row in range(block["start"], block["end"] + 1):
                raw_time = detector.get_cell_value(row, hours_column)
                t_val = self.normalize_time(raw_time)
                if t_val is not None:
                    time_rows.append({"row": row, "time": t_val})

            idx = 0
            while idx < len(time_rows):
                tr = time_rows[idx]
                row = tr["row"]
                time_value = tr["time"]

                value = detector.get_cell_value(row, column)
                parsed = self.parse_subject(value)
                if parsed is None:
                    idx += 1
                    continue

                details_text = self.get_details(sheet, row, column, block["end"], hours_column)
                formatted_time = self.format_time_str(time_value)

                if isinstance(parsed, list):
                    for s in parsed:
                        all_elective_options.add(s["base_code"])

                    if selected_electives:
                        subjects_to_add = [s for s in parsed if s["base_code"] in selected_electives]
                    else:
                        subjects_to_add = [{
                            "code": " / ".join([s["base_code"] for s in parsed]),
                            "base_code": "ELECTIVE_SLOT",
                            "type": parsed[0]["type"]
                        }]
                else:
                    subjects_to_add = [parsed]

                is_practical = any(s["type"] == "Practical" for s in subjects_to_add)

                for subj in subjects_to_add:
                    # Period 1
                    lectures.append({
                        "time": formatted_time,
                        "subject": subj["code"],
                        "type": subj["type"],
                        "info": details_text
                    })

                    # Period 2 (If Practical / Lab)
                    if subj["type"] == "Practical" and (idx + 1) < len(time_rows):
                        next_time_val = time_rows[idx + 1]["time"]
                        next_formatted_time = self.format_time_str(next_time_val)
                        lectures.append({
                            "time": next_formatted_time,
                            "subject": subj["code"],
                            "type": subj["type"],
                            "info": details_text
                        })

                # Skip the next time slot if this was a 2-period practical
                if is_practical and (idx + 1) < len(time_rows):
                    idx += 2
                else:
                    idx += 1

            timetable[block["day"]] = lectures

        return timetable, sorted(list(all_elective_options))