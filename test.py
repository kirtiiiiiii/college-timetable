from core.scanner import WorkbookScanner
from core.indexer import BatchIndexer
from core.extractor import TimetableExtractor
from core.formatter import TimetableFormatter

scanner = WorkbookScanner("uploads/timetable.xlsx")
scanner.load()

indexer = BatchIndexer(scanner.workbook)
batch_index = indexer.build_index()

batch = "3F1D"

extractor = TimetableExtractor(
    scanner.workbook,
    batch_index
)

timetable = extractor.extract(batch)

formatter = TimetableFormatter(timetable)

formatter.print()