import os
from flask import Flask, render_template, jsonify, request
import openpyxl
from core.indexer import BatchIndexer
from core.extractor import TimetableExtractor

app = Flask(__name__)

# Build absolute path to uploads/timetable.xlsx
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH_UPLOADS = os.path.join(BASE_DIR, 'uploads', 'timetable.xlsx')
EXCEL_PATH_ROOT = os.path.join(BASE_DIR, 'timetable.xlsx')

# Check uploads folder first, then root folder
if os.path.exists(EXCEL_PATH_UPLOADS):
    EXCEL_PATH = EXCEL_PATH_UPLOADS
elif os.path.exists(EXCEL_PATH_ROOT):
    EXCEL_PATH = EXCEL_PATH_ROOT
else:
    raise FileNotFoundError(
        f"\n\n[ERROR] Could not find 'timetable.xlsx' in uploads or root directory!\n"
        f"Checked paths:\n  - {EXCEL_PATH_UPLOADS}\n  - {EXCEL_PATH_ROOT}\n"
        "Please ensure your file is named 'timetable.xlsx'."
    )

print(f"Loading workbook from: {EXCEL_PATH}")

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
indexer = BatchIndexer(wb)
batch_index = indexer.build_index()
extractor = TimetableExtractor(wb, batch_index)
print(f"Indexed {len(batch_index)} batches successfully!")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/batches')
def get_batches():
    return jsonify(sorted(list(batch_index.keys())))

@app.route('/timetable/<batch>')
def get_timetable(batch):
    batch = batch.upper().strip()
    
    if batch not in batch_index:
        return jsonify({"error": f"Batch '{batch}' not found!"}), 404

    electives_param = request.args.get('electives', '')
    selected_electives = [e.strip() for e in electives_param.split(',') if e.strip()]

    timetable, available_electives = extractor.extract(batch, selected_electives)

    if available_electives and not selected_electives:
        return jsonify({
            "requires_electives": True,
            "available_electives": available_electives
        })

    return jsonify(timetable)

if __name__ == '__main__':
    app.run(debug=True, port=5000)