import re
from datetime import time
from core.detector import StructureDetector

class TimetableExtractor:
    SUBJECT_PATTERN = re.compile(r"([A-Z]{2,5}\d{3})([LPT])")
    
    # Matches codes like B301, C203 LAB, E306, LT102, G204 LAB, etc.
    ROOM_PATTERN = re.compile(r"^[A-Z0-9\-/]+(\s+LAB)?$", re.IGNORECASE)
    
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
            base_code = m.group(1)
            type_char = m.group(2)
            results.append({
                "base_code": base_code,
                "code": f"{base_code}{type_char}",
                "type": self.TYPE_MAP.get(type_char, "Lecture")
            })

        return results[0] if len(results) == 1 else results

    def normalize_time(self, value):
        if value is None:
            return None
        if isinstance(value, time):
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

        return time(hour, minute) if hour <= 23 and minute <= 59 else None

    def get_hours_column(self, sheet):
        if sheet.title not in self._hours_column_cache:
            detector = StructureDetector(sheet)
            self._hours_column_cache[sheet.title] = detector.find_hours_column()
        return self._hours_column_cache[sheet.title]

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
            end = starts[i + 1] - 1 if i < len(starts) - 1 else sheet.max_row
            blocks.append({"day": self.DAYS[i], "start": start, "end": end})

        return blocks

    def get_details(self, sheet, row, column, block_end):
        detector = StructureDetector(sheet)
        room, faculty = "N/A", "N/A"

        # Check sub-rows immediately underneath subject text for Room & Faculty initials
        for next_row in range(row + 1, min(row + 3, block_end + 1)):
            cell_val = detector.get_cell_value(next_row, column)
            if not cell_val:
                continue
            
            text = str(cell_val).strip()
            if self.parse_subject(text):
                break  # Stop if reaching the next subject
            
            # Identify room strings (e.g. B301, C203 LAB, E306)
            if self.ROOM_PATTERN.match(text) and room == "N/A":
                room = text
            elif len(text) <= 6 and faculty == "N/A":
                faculty = text

        return {"room": room, "faculty": faculty}

    def extract(self, batch, selected_electives=None):
        if selected_electives is None:
            selected_electives = []

        info = self.batch_index[batch]
        sheet = self.workbook[info["sheet"]]
        detector = StructureDetector(sheet)
        column = info["column"]

        hours_column = self.get_hours_column(sheet)
        if hours_column is None:
            raise ValueError(f"No HOURS column found on sheet '{sheet.title}'.")

        timetable = {}
        day_blocks = self.find_day_blocks(sheet, hours_column)
        all_elective_options = set()

        for block in day_blocks:
            lectures = []

            for row in range(block["start"], block["end"] + 1):
                raw_time = detector.get_cell_value(row, hours_column)
                time_value = self.normalize_time(raw_time)
                if time_value is None:
                    continue

                value = detector.get_cell_value(row, column)
                parsed = self.parse_subject(value)
                if parsed is None:
                    continue

                details = self.get_details(sheet, row, column, block["end"])
                formatted_time = time_value.strftime("%I:%M %p")

                if isinstance(parsed, list):
                    for s in parsed:
                        all_elective_options.add(s["base_code"])

                    if selected_electives:
                        matching = [
                            s for s in parsed
                            if s["base_code"] in selected_electives or s["code"] in selected_electives
                        ]
                        subjects_to_add = matching
                    else:
                        subjects_to_add = [{
                            "code": " / ".join([s["code"] for s in parsed]),
                            "base_code": "ELECTIVE_SLOT",
                            "type": parsed[0]["type"]
                        }]
                else:
                    subjects_to_add = [parsed]

                for subj in subjects_to_add:
                    lectures.append({
                        "time": formatted_time,
                        "subject": subj["code"],
                        "type": subj["type"],
                        "room": details["room"],
                        "faculty": details["faculty"]
                    })

            timetable[block["day"]] = lectures

        return timetable, sorted(list(all_elective_options))