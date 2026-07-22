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

// Convert "9:40 AM" to minutes from midnight
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(" ");
    const times = parts[0].split(":");
    let hours = parseInt(times[0], 10);
    const minutes = parseInt(times[1], 10);
    const meridiem = parts[1] ? parts[1].toUpperCase() : "AM";

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
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

    data.forEach(day => {
        const column = document.createElement("div");
        column.className = "day";
        column.innerHTML = `<h2>${day.day}</h2>`;

        const classes = day.classes || [];

        // Sort classes chronologically by start time
        classes.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

        for (let i = 0; i < classes.length; i++) {
            const cls = classes[i];

            // Check if there is a gap (> 60 mins) between this class and the previous one
            if (i > 0) {
                const prevMins = parseTimeToMinutes(classes[i - 1].time);
                const currMins = parseTimeToMinutes(cls.time);
                
                // If classes are separated by more than 60 mins, add a Break slot
                if (currMins - prevMins > 60) {
                    const breakCard = document.createElement("div");
                    breakCard.className = "card break-card";
                    breakCard.innerHTML = `<div class="break-text">☕ Break</div>`;
                    column.appendChild(breakCard);
                }
            }

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
        }

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