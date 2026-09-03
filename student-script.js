document.addEventListener('DOMContentLoaded', function() {
    // ... (DOM Elements and State variables remain the same)
    const loginView = document.getElementById('login-view');
    const activityView = document.getElementById('activity-view');
    const classSelect = document.getElementById('class-select');
    const groupSelect = document.getElementById('group-select');
    const startBtn = document.getElementById('start-btn');
    const infoHeader = document.getElementById('info-header');
    const imageContainer = document.getElementById('image-container');
    const submitBtn = document.getElementById('submit-btn');
    const editBtn = document.getElementById('edit-btn');
    let studentInfo = {}, markers = [], isSubmitted = false;

    function initializeSelectors() {
        const classes = Array.from({ length: 6 }, (_, i) => ['A', 'B', 'C', 'D'].map(c => `${i + 1}${c}`)).flat();
        classes.forEach(c => classSelect.add(new Option(`${c}班`, c)));
        for (let i = 1; i <= 10; i++) groupSelect.add(new Option(`第${i}組`, i));
    }

    startBtn.addEventListener('click', () => {
        studentInfo = { className: classSelect.value, groupNum: parseInt(groupSelect.value), docId: `${classSelect.value}-${groupSelect.value}` };
        const imageNum = (studentInfo.groupNum - 1) % 6 + 1;
        studentInfo.imageNum = imageNum;
        imageContainer.innerHTML = `<img id="activity-image" src="images/lab_safety_${imageNum}.png">`;
        infoHeader.textContent = `${studentInfo.className}班 第${studentInfo.groupNum}組`;
        loginView.classList.add('hidden');
        activityView.classList.remove('hidden');
        loadExistingSubmission();
    });

    imageContainer.addEventListener('click', (e) => {
        if (isSubmitted || e.target.closest('.marker') || e.target.closest('.explanation-box')) return;
        const rect = imageContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 100;
        const y = (e.clientY - rect.top) / rect.height * 100;
        markers.push({ id: Date.now(), x, y, explanation: '' });
        renderAllMarkers(false);
        const lastMarker = document.querySelector(`.marker[data-id="${markers[markers.length - 1].id}"]`);
        if (lastMarker) lastMarker.click();
    });
    
    submitBtn.addEventListener('click', handleSubmit);
    editBtn.addEventListener('click', handleEdit);

    async function loadExistingSubmission() {
        const doc = await db.collection('submissions').doc(studentInfo.docId).get();
        if (doc.exists) {
            isSubmitted = true;
            markers = doc.data().markers;
            submitBtn.classList.add('hidden');
            editBtn.classList.remove('hidden');
            renderAllMarkers(true);
            alert('偵測到您已提交過答案，將載入您先前的作答。');
        }
    }

    function renderAllMarkers(isLocked) {
        imageContainer.querySelectorAll('.marker, .explanation-box').forEach(el => el.remove());
        markers.forEach((markerData, index) => createMarkerUI(markerData, index + 1, isLocked));
    }

    function createMarkerUI(markerData, index, isLocked) {
        const markerDiv = document.createElement('div');
        markerDiv.className = 'marker';
        markerDiv.style.left = `${markerData.x}%`;
        markerDiv.style.top = `${markerData.y}%`;
        markerDiv.textContent = index;
        markerDiv.dataset.id = markerData.id;

        const box = document.createElement('div');
        box.className = 'explanation-box hidden';
        const textarea = document.createElement('textarea');
        textarea.value = markerData.explanation;
        textarea.disabled = isLocked;
        textarea.oninput = () => markerData.explanation = textarea.value;
        
        const controls = document.createElement('div');
        controls.className = 'explanation-controls';
        const hideBtn = document.createElement('button');
        hideBtn.className = 'hide-btn';
        hideBtn.textContent = '隱藏';
        hideBtn.onclick = () => box.classList.add('hidden');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '刪除';
        deleteBtn.onclick = () => {
            markers = markers.filter(m => m.id !== markerData.id);
            renderAllMarkers(false);
        };
        controls.appendChild(hideBtn);
        if (!isLocked) controls.appendChild(deleteBtn);
        box.appendChild(textarea);
        box.appendChild(controls);
        
        markerDiv.addEventListener('click', e => {
            e.stopPropagation();
            box.classList.toggle('hidden');
            if (!box.classList.contains('hidden')) adjustBoxPosition(box, markerDiv, imageContainer);
        });

        imageContainer.appendChild(markerDiv);
        imageContainer.appendChild(box);
    }
    
    async function handleSubmit() {
        // ... (This function remains largely the same)
    }
    function handleEdit() {
        // ... (This function remains the same)
    }
    function adjustBoxPosition(box, marker, container) {
        // ... (This function remains the same)
    }

    initializeSelectors();
});
