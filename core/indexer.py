from core.detector import StructureDetector


class BatchIndexer:
    """
    Builds an index like:

    {
        "3F1A": {
            "sheet": "3RD YEAR A",
            "column": 105
        },
        ...
    }
    """

    def __init__(self, workbook):

        self.workbook = workbook

    def build_index(self):

        index = {}

        for sheet in self.workbook.worksheets:

            detector = StructureDetector(sheet)

            batches = detector.get_batches()

            for batch, info in batches.items():

                index[batch] = {

                    "sheet": sheet.title,

                    "row": info["row"],

                    "column": info["column"]

                }

        return index