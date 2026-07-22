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

    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    if (data.requires_electives) {
        renderGlobalElectivePicker(data.available_electives);
        return;
    }

    if (data.error) {
        alert(data.error);
        return;
    }

    // Standard hourly grid for gap alignment
    const standardHours = [
        "8:00 AM", "8:50 AM", "9:40 AM", "10:30 AM", "11:20 AM", 
        "12:10 PM", "1:00 PM", "1:50 PM", "2:40 PM", "3:30 PM", "4:20 PM", "5:10 PM"
    ];

    data.forEach(day => {
        const column = document.createElement("div");
        column.className = "day";
        column.innerHTML = `<h2>${day.day}</h2>`;

        // Map existing classes by time string
        const classMap = {};
        day.classes.forEach(c => { classMap[c.time] = c; });

        standardHours.forEach(timeSlot => {
            if (classMap[timeSlot]) {
                const cls = classMap[timeSlot];
                const card = document.createElement("div");
                card.className = "card";
                card.style.background = cls.color;
                card.innerHTML = `
                    <div class="time">${cls.time}</div>
                    <div class="subject">${cls.subject}</div>
                    <div class="type">${cls.type}</div>
                    <div class="info">📍 Room: ${cls.room}</div>
                    <div class="info">👤 Faculty: ${cls.faculty}</div>
                `;
                column.appendChild(card);
            } else {
                // Empty Break Slot to preserve timeline height
                const emptyCard = document.createElement("div");
                emptyCard.className = "card empty-card";
                emptyCard.innerHTML = `<div class="time">${timeSlot}</div><div class="break-text">Break</div>`;
                column.appendChild(emptyCard);
            }
        });

        calendar.appendChild(column);
    });
}

function renderGlobalElectivePicker(availableElectives) {
    const calendar = document.getElementById("calendar");
    let optionsHtml = availableElectives.map(code => `<option value="${code}">${code}</option>`).join("");

    calendar.innerHTML = `
        <div style="grid-column: span 6; background: white; padding: 40px; border-radius: 18px; box-shadow: 0 10px 20px rgba(0,0,0,.08); text-align: center; max-width: 500px; margin: 0 auto;">
            <h2>Select Your Elective Course</h2>
            <p style="margin: 10px 0 20px 0; color: #666;">Choose your elective course once to apply it across all days.</p>
            <select id="singleElectiveSelect" style="width: 100%; padding: 12px; border-radius: 10px; font-size: 16px; border: 1px solid #ccc; margin-bottom: 20px;">
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

// Download PNG using html2canvas
function downloadPNG() {
    const calendar = document.getElementById("calendar");
    if (!calendar.hasChildNodes()) {
        alert("Please generate a timetable first!");
        return;
    }
    html2canvas(calendar, { scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = "Timetable.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

// Download PDF using html2canvas + jsPDF
function downloadPDF() {
    const calendar = document.getElementById("calendar");
    if (!calendar.hasChildNodes()) {
        alert("Please generate a timetable first!");
        return;
    }
    html2canvas(calendar, { scale: 2 }).then(canvas => {
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