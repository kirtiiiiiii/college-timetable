class TimetableFormatter:

    DAYS = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ]

    COLORS = {
        "Lecture": "#4F8EF7",      # blue
        "Tutorial": "#34C759",     # green
        "Practical": "#FF4D4D"     # red
    }

    def __init__(self, timetable):
        self.timetable = timetable

    def format(self):

        result = []

        for day in self.DAYS:

            day_events = []

            classes = self.timetable.get(day, [])

            for cls in classes:

                event = {

                    "subject": cls["subject"],

                    "type": cls["type"],

                    "time": cls["time"],

                    "room": cls.get("room", "N/A"),

                    "faculty": cls.get("faculty", "N/A"),

                    "lab": cls.get("lab", False),

                    "color": self.COLORS.get(
                        cls["type"],
                        "#888888"
                    )

                }

                day_events.append(event)

            result.append({

                "day": day,

                "classes": day_events

            })

        return result

    def print(self):

        formatted = self.format()

        for day in formatted:

            print("\n" + "=" * 40)
            print(day["day"].upper())
            print("=" * 40)

            if not day["classes"]:
                print("No classes.")
                continue

            for cls in day["classes"]:

                print(
                    f"{cls['time']} | "
                    f"{cls['subject']} | "
                    f"{cls['type']} | "
                    f"{cls['room']} | "
                    f"{cls['faculty']}"
                )