import os
from flask import Flask, jsonify, render_template, request

from core.scanner import WorkbookScanner
from core.indexer import BatchIndexer
from core.extractor import TimetableExtractor
from core.formatter import TimetableFormatter

app = Flask(__name__)

print("📂 Loading workbook...")
scanner = WorkbookScanner("uploads/timetable.xlsx")
scanner.load()
print("✅ Workbook loaded!")

indexer = BatchIndexer(scanner.workbook)
batch_index = indexer.build_index()

extractor = TimetableExtractor(scanner.workbook, batch_index)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/batches")
def get_batches():
    # Return sorted list of all available batch names for autocomplete
    return jsonify(sorted(list(batch_index.keys())))


@app.route("/timetable/<batch>")
def timetable(batch):
    if batch not in batch_index:
        return jsonify({"error": "Batch not found"}), 404

    electives_param = request.args.get("electives", "")
    selected_electives = [e.strip() for e in electives_param.split(",") if e.strip()]

    extracted_timetable, available_electives = extractor.extract(
        batch, selected_electives=selected_electives
    )

    if available_electives and not selected_electives:
        return jsonify({
            "requires_electives": True,
            "available_electives": available_electives
        })

    formatted = TimetableFormatter(extracted_timetable).format()
    return jsonify(formatted)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)