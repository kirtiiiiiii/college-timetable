document.addEventListener("DOMContentLoaded", () => {
    fetchBatchesForAutocomplete();
});

async function fetchBatchesForAutocomplete() {
    try {
        const response = await fetch('/api/batches');
        const batches = await response.json();
        const datalist = document.getElementById('batchList');
        datalist.innerHTML = batches.map(b => `<option value="${b}">`).join('');
    } catch (err) {
        console.error("Could not load batches:", err);
    }
}

const standardSlots = [
    "08:00 AM", "08:50 AM", "09:40 AM", "10:30 AM", "11:20 AM",
    "12:10 PM", "01:00 PM", "01:50 PM", "02:40 PM", "03:30 PM", "04:20 PM", "05:10 PM"
];

const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function loadTimetable(selectedElectives = []) {
    const batchInput = document.getElementById("batch");
    const batch = batchInput.value.trim().toUpperCase();
    
    if (!batch) {
        alert("Please enter or select a batch code!");
        return;
    }

    let url = `/timetable/${batch}`;
    if (selectedElectives.length > 0) {
        url += `?electives=${encodeURIComponent(selectedElectives.join(","))}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    const grid = document.getElementById("timetableGrid");
    grid.innerHTML = "";

    if (data.requires_electives) {
        renderGlobalElectivePicker(data.available_electives);
        return;
    }

    if (data.error) {
        alert(data.error);
        return;
    }

    // 1. Build Header Row (Time + Days)
    grid.appendChild(createHeaderCell("Time"));
    daysList.forEach(day => grid.appendChild(createHeaderCell(day)));

    // Index API payload by day and formatted time
    const scheduleMap = {};
    data.forEach(d => {
        scheduleMap[d.day] = {};
        (d.classes || []).forEach(c => {
            scheduleMap[d.day][c.time] = c;
        });
    });

    // 2. Build Grid Row by Row for each standard time slot
    standardSlots.forEach(slot => {
        // Time Label Column
        const timeCell = document.createElement("div");
        timeCell.className = "time-slot";
        const [timePart, meridiem] = slot.split(" ");
        timeCell.innerHTML = `<div>${timePart}</div><div>${meridiem}</div>`;
        grid.appendChild(timeCell);

        // Day Cells
        daysList.forEach(day => {
            const cell = document.createElement("div");
            cell.className = "slot-cell";

            const cls = scheduleMap[day] && scheduleMap[day][slot];
            if (cls) {
                const card = document.createElement("div");
                card.className = "class-card";
                
                const typeClass = (cls.type || "Lecture").toLowerCase();

                card.innerHTML = `
                    <div>
                        <span class="badge ${typeClass}">${cls.type}</span>
                        <div class="subject-name">${cls.subject}</div>
                        <div class="room-text">${cls.room !== 'N/A' ? cls.room : ''}</div>
                        <div class="faculty-text">${cls.faculty !== 'N/A' ? cls.faculty : ''}</div>
                    </div>
                    <span class="subject-code-tag">${cls.subject}</span>
                `;
                cell.appendChild(card);
            }

            grid.appendChild(cell);
        });
    });
}

function createHeaderCell(text) {
    const div = document.createElement("div");
    div.className = "grid-header";
    div.innerText = text;
    return div;
}

function renderGlobalElectivePicker(availableElectives) {
    const grid = document.getElementById("timetableGrid");
    let optionsHtml = availableElectives.map(code => `<option value="${code}">${code}</option>`).join("");

    grid.innerHTML = `
        <div style="grid-column: span 7; background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 450px; margin: 20px auto;">
            <h2>Select Your Elective Course</h2>
            <p style="margin: 10px 0 20px 0; color: #666;">Choose your elective course once to apply it across all days.</p>
            <select id="singleElectiveSelect" style="width: 100%; padding: 10px; border-radius: 6px; font-size: 15px; border: 1px solid #ccc; margin-bottom: 20px;">
                <option value="" disabled selected>-- Choose Course --</option>
                ${optionsHtml}
            </select>
            <button onclick="applySingleElective()" style="width: 100%;">Confirm & Generate</button>
        </div>
    `;
}

function applySingleElective() {
    const select = document.getElementById("singleElectiveSelect");
    if (!select.value) {
        alert("Please select an elective course!");
        return;
    }
    loadTimetable([select.value]);
}

function downloadPNG() {
    const wrapper = document.getElementById("timetableWrapper");
    html2canvas(wrapper, { scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = "Timetable.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

function downloadPDF() {
    const wrapper = document.getElementById("timetableWrapper");
    html2canvas(wrapper, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("landscape", "pt", "a4");
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, "PNG", 0, 20, pdfWidth, pdfHeight);
        pdf.save("Timetable.pdf");
    });
}