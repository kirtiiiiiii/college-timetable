from core.scanner import WorkbookScanner

scanner = WorkbookScanner("uploads/timetable.xlsx")
scanner.load()

sheet = scanner.workbook["3RD YEAR A"]

print("Day start rows:\n")

for row in range(1, sheet.max_row + 1):

    value = sheet.cell(row=row, column=1).value

    if value in ["M", "T", "W", "F", "S"]:
        print(value, "starts at row", row)

    if value == "D":
        print("D at row", row)

    if value == "Y":
        print("Y at row", row)