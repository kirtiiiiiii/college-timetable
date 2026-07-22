from openpyxl import load_workbook


class WorkbookScanner:
    def __init__(self, filepath):
        self.filepath = filepath
        self.workbook = None

    def load(self):
        print("📂 Loading workbook...")

        # data_only=True reads values instead of formulas
        # read_only=True streams the file, drastically cutting load time
        self.workbook = load_workbook(
            self.filepath,
            data_only=True,
            read_only=False  # Keep False if using merged cell checks, but optimize reload
        )

        print("✅ Workbook loaded!")
        return self.workbook