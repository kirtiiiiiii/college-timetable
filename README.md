# College Timetable Generator

A web-based college timetable generator that extracts and organizes class schedules from an Excel workbook. Users can generate personalized timetables by entering their batch identifier, select elective courses where applicable, and download their schedules as PNG images or PDF documents.

**Live Demo:** [https://tiet-timetable-generator.onrender.com/](https://tiet-timetable-generator.onrender.com/)

> **Note:** The application is hosted on Render's free tier. The server may take approximately 30–60 seconds to wake up after a period of inactivity.

## Features

- **Automatic Batch Detection:** Scans the Excel timetable workbook and builds an index of available batches for quick lookup.
- **Batch-Based Timetable Generation:** Generate personalized timetables by entering a batch identifier (e.g., `3F1D`).
- **Batch Autocomplete:** Provides suggestions for available batch identifiers while typing.
- **Elective Selection:** Detects available elective courses and allows users to select their preferred elective before generating the timetable.
- **Class Type Identification:** Automatically identifies and distinguishes lectures, practicals and tutorials.
- **Practical Slot Handling:** Recognizes practical sessions spanning two consecutive time slots and displays them as continuous blocks.
- **Structured Timetable Display:** Organizes schedules into a weekly grid covering Monday through Saturday.
- **Download as PNG:** Export the generated timetable as a high-resolution PNG image.
- **Download as PDF:** Export the timetable as a landscape-oriented PDF document.
- **Responsive Interface:** Supports horizontal scrolling and layout adjustments for smaller screens.

## Tech Stack

**Backend:**
- Python
- Flask
- OpenPyXL

**Frontend:**
- HTML5
- CSS3
- JavaScript
- CSS Grid for timetable layout

**Export Libraries:**
- html2canvas – Captures the generated timetable as an image.
- jsPDF – Converts the captured timetable into a downloadable PDF.

**Deployment:**
- Render

## How It Works

1. The application loads the college timetable from an Excel workbook using OpenPyXL.
2. A batch indexer scans the workbook sheets and identifies available batch identifiers along with their corresponding sheet locations.
3. The user enters or selects a batch identifier through the web interface.
4. The timetable extractor processes the relevant worksheet, identifies class timings and extracts subject codes and associated details.
5. If elective options are available, the application prompts the user to select an elective before generating the final timetable.
6. The extracted schedule is returned through Flask API endpoints and dynamically rendered as a weekly timetable using JavaScript.
7. Users can download the generated timetable as a PNG image or PDF.

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/kirtiiiiiii/college-timetable.git
cd college-timetable
```

### 2. Create and activate a virtual environment (optional)

```bash
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Add the timetable workbook

Place the Excel workbook named `timetable.xlsx` inside the `uploads/` directory.

The application checks the `uploads/` directory first and then the project root directory.

### 5. Run the application

```bash
python app.py
```

### 6. Open in your browser

Navigate to:

```text
http://localhost:5000
```

## Project Structure

```text
college-timetable/
│
├── app.py                  # Flask application and API endpoints
├── parser.py               # Workbook parsing utility
├── requirements.txt        # Python dependencies
├── test.py                 # Testing / development utility
│
├── core/
│   ├── detector.py         # Detects workbook structure, batches and subjects
│   ├── indexer.py          # Builds an index of available batches
│   ├── extractor.py        # Extracts and processes timetable information
│   └── scanner.py          # Loads and scans Excel workbooks
│
├── templates/
│   └── index.html          # Main HTML interface
│
├── static/
│   ├── style.css           # Styling and responsive timetable layout
│   └── script.js           # Frontend logic and timetable rendering
│
└── uploads/
    └── timetable.xlsx     # Source timetable workbook
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Serves the main web interface |
| `/api/batches` | GET | Returns the list of available batch identifiers |
| `/timetable/<batch>` | GET | Generates a timetable for the specified batch |
| `/timetable/<batch>?electives=<codes>` | GET | Generates a timetable using the selected elective courses |

## Author

**Kirti Gupta**

- [GitHub](https://github.com/kirtiiiiiii)
- [LinkedIn](https://www.linkedin.com/in/kirti-gupta-249838419/)
