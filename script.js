let students = [];
let courses = [];
let mergedData = [];
let filteredData = [];
let currentPage = 1;
let sortOrder = 1;
const rowsPerPage = 5;

/* ================= ALERT ================= */
function showAlert(msg, type = "danger") {
    $("#alertBox").html(`
        <div class="alert alert-${type} alert-dismissible fade show">
            ${msg}
            <button class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
}

/* ================= LOADER ================= */
function showLoader(state) {
    $("#loader").toggleClass("d-none", !state);
}

/* ================= BUTTON CONTROL ================= */
function disableButtons(state) {
    $("button").prop("disabled", state);
}

/* ================= STATS ================= */
function updateStats(data) {
    let green = 0;
    let red = 0;
    let missingMarks = 0;

    data.forEach(d => {
        if (d.marks === "N/A") missingMarks++;
        if (d.marks !== "N/A") {
            if (d.marks > 90) green++;
            else if (d.marks < 50) red++;
        }
    });

    $("#sv-total").text(data.length);
    $("#sv-courses").text(courses.length);
    $("#sv-green").text(green);
    $("#sv-red").text(red);
    $("#sv-missing").text(missingMarks);
}

function refreshDashboardStats() {
    if (mergedData.length) {
        updateStats(filteredData);
        return;
    }
    $("#sv-total").text(students.length ? students.length : "—");
    $("#sv-courses").text(courses.length ? courses.length : "—");
    $("#sv-green, #sv-red, #sv-missing").text("—");
}

/* ================= JSON ================= */
$("#loadJson").click(function () {

    if (students.length) return showAlert("JSON already loaded", "warning");

    showLoader(true);
    disableButtons(true);

    $.ajax({
        url: "data/student.json",
        dataType: "json",
        success: function (data) {
            students = data;
            $("#dotJson").addClass("loaded");
            refreshDashboardStats();
            showAlert("JSON Loaded", "success");
        },
        error: () => showAlert("JSON Load Failed", "danger"),
        complete: () => {
            showLoader(false);
            disableButtons(false);
        }
    });
});

/* ================= XML ================= */
$("#loadXml").click(function () {

    if (courses.length) return showAlert("XML already loaded", "warning");

    showLoader(true);
    disableButtons(true);

    $.ajax({
        url: "data/courses.xml",
        dataType: "xml",
        success: function (xml) {

            $(xml).find("course").each(function () {
                courses.push({
                    id: $(this).find("id").text().trim(),
                    name: $(this).find("name").text().trim(),
                    instructor: $(this).find("instructor").text().trim()
                });
            });

            $("#dotXml").addClass("loaded");
            refreshDashboardStats();
            showAlert("XML Loaded", "success");
        },
        error: () => showAlert("XML Load Failed", "danger"),
        complete: () => {
            showLoader(false);
            disableButtons(false);
        }
    });
});

/* ================= MERGE ================= */
$("#mergeData").click(function () {

    if (!students.length || !courses.length)
        return showAlert("Load both JSON & XML first", "warning");

    mergedData = students.map(s => {

        let c = courses.find(x => String(x.id) === String(s.course_id));

        return {
            name: s.name,
            course: c ? c.name : "Unknown Course",
            instructor: c ? c.instructor : "N/A",
            marks: s.marks ?? "N/A"
        };
    });

    filteredData = [...mergedData];
    currentPage = 1;
    updateStats(filteredData);
    renderTable();
});

/* ================= TABLE ================= */
function updateTableCount() {
    let total = filteredData.length;
    if (!total) {
        $("#tableCount").text("Showing 0 records");
        return;
    }
    let start = (currentPage - 1) * rowsPerPage + 1;
    let end = Math.min(currentPage * rowsPerPage, total);
    $("#tableCount").text(`Showing ${start}–${end} of ${total} records`);
}

function renderTable() {

    let tbody = $("#dataTable tbody");
    tbody.empty();

    let start = (currentPage - 1) * rowsPerPage;
    let pageData = filteredData.slice(start, start + rowsPerPage);

    pageData.forEach((row, idx) => {

        let tr = $("<tr>");

        let m = row.marks;
        if (m !== "N/A") {
            if (m > 90) tr.addClass("green");
            else if (m < 50) tr.addClass("red");
        }
        if (row.course === "Unknown Course" || m === "N/A") tr.addClass("yellow");

        let rowNum = start + idx + 1;
        tr.html(`
            <td>${rowNum}</td>
            <td>${row.name}</td>
            <td>${row.course}</td>
            <td>${row.instructor}</td>
            <td>${row.marks}</td>
        `);

        tbody.append(tr);
    });

    updateTableCount();
    renderPagination();
}

/* ================= SEARCH ================= */
$("#search").on("keyup", function () {

    let val = $(this).val().toLowerCase();

    filteredData = mergedData.filter(d =>
        d.name.toLowerCase().includes(val) ||
        d.course.toLowerCase().includes(val) ||
        d.instructor.toLowerCase().includes(val)
    );

    currentPage = 1;
    updateStats(filteredData);
    renderTable();
});

/* ================= SORT ================= */
$("#dataTable thead").on("click", "th[data-key]", function () {

    let key = $(this).data("key");

    filteredData.sort((a, b) => {
        let cmp = 0;
        if (key === "marks") {
            let va = a.marks === "N/A" ? null : Number(a.marks);
            let vb = b.marks === "N/A" ? null : Number(b.marks);
            if (va === null && vb === null) cmp = 0;
            else if (va === null) cmp = 1;
            else if (vb === null) cmp = -1;
            else cmp = va - vb;
        } else {
            cmp = String(a[key]).localeCompare(String(b[key]), undefined, { sensitivity: "base" });
        }
        return cmp * sortOrder;
    });

    sortOrder *= -1;
    currentPage = 1;
    renderTable();
});

/* ================= PAGINATION ================= */
function renderPagination() {

    let pages = Math.ceil(filteredData.length / rowsPerPage);
    let html = "";

    for (let i = 1; i <= pages; i++) {
        let active = i === currentPage ? " active" : "";
        html += `<button type="button" class="btn btn-sm btn-secondary m-1 pageBtn${active}">${i}</button>`;
    }

    $("#pagination").html(html);
}

$("#pagination").on("click", ".pageBtn", function () {
    currentPage = parseInt($(this).text(), 10);
    renderTable();
});

/* ================= CLEAR ================= */
$("#clearData").click(function () {
    students = [];
    courses = [];
    mergedData = [];
    filteredData = [];
    currentPage = 1;
    sortOrder = 1;
    $("#search").val("");
    $("#dotJson, #dotXml").removeClass("loaded");
    $("#dataTable tbody").empty();
    $("#pagination").empty();
    $("#tableCount").text("Showing 0 records");
    $("#jsonOutput").addClass("d-none").empty();
    refreshDashboardStats();
    showAlert("Data Cleared", "success");
});


$("#xmlToJson").click(function () {

    if (!courses.length) {
        showAlert("Load XML first before converting", "warning");
        return;
    }

    let jsonData = courses.map(c => ({
        id: c.id,
        name: c.name,
        instructor: c.instructor
    }));

    console.log("XML to JSON:", jsonData);

    $("#jsonOutput")
        .removeClass("d-none")
        .text(JSON.stringify(jsonData, null, 2));

    showAlert("XML converted to JSON successfully", "success");
});

$("#exportCSV").click(function () {

    if (!filteredData.length) {
        showAlert("No data available to export", "warning");
        return;
    }

    let csv = "Name,Course,Instructor,Marks\n";

    filteredData.forEach(d => {

        let name = d.name || "";
        let course = d.course || "";
        let instructor = d.instructor || "";
        let marks = d.marks ?? "N/A";

        csv += `${name},${course},${instructor},${marks}\n`;
    });

    let blob = new Blob([csv], { type: "text/csv" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "students_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showAlert("CSV exported successfully", "success");
});
