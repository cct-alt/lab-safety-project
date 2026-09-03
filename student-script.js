document.addEventListener('DOMContentLoaded', function() {
    const loginView = document.getElementById('login-view');
    const activityView = document.getElementById('activity-view');
    const classSelect = document.getElementById('class-select');
    const groupSelect = document.getElementById('group-select');
    const startBtn = document.getElementById('start-btn');
    const infoHeader = document.getElementById('info-header');
    const imageContainer = document.getElementById('image-container');
    const submitBtn = document.getElementById('submit-btn');
    const editBtn = document.getElementById('edit-btn');

    let studentInfo = {};
    let markers = [];
    let isSubmitted = false;

    function initializeSelectors() {
        const classes = Array.from({ length: 6 }, (_, i) => ['A', 'B', 'C', 'D'].map(c => `${i + 1}${c}`)).flat();
        classes.forEach(c => classSelect.add(new Option(`${c}班`, c)));
        for (let i = 1; i <= 10; i++) groupSelect.add(new Option(`第${i}組`, i));
    }

    startBtn.addEventListener('click', () => {
        studentInfo = { className: classSelect.value, groupNum: parseInt(groupSelect.value), docId: `${classSelect.value}-${groupSelect.value}` };
        const imageNum = (studentInfo.groupNum - 1) % 6 + 1;
        studentInfo.imageNum = imageNum;
        
        imageContainer.innerHTML = `<img id="activity-image" src="images/lab_safety_${imageNum}.png" alt="實驗室圖片">`;
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
            alert('偵測到您已提交過答案，將載入您先前的作答。');
            renderAllMarkers(true);
        }
    }

    function renderAllMarkers(isLocked = false) {
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
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        const incomplete = markers.filter(m => !m.explanation.trim());
        if (incomplete.length > 0) {
            alert('您有尚未完成的解釋，請補充！');
            incomplete.forEach(markerData => {
                const markerDiv = document.querySelector(`.marker[data-id="${markerData.id}"]`);
                if (markerDiv) {
                    markerDiv.classList.add('error');
                    const box = markerDiv.nextElementSibling;
                    box.classList.remove('hidden');
                    box.querySelector('textarea').classList.add('error');
                    adjustBoxPosition(box, markerDiv, imageContainer);
                }
            });
            return;
        }
        if (markers.length === 0) return alert('請至少標示一個危險之處！');
        await db.collection('submissions').doc(studentInfo.docId).set({ ...studentInfo, markers, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert('提交成功！');
        isSubmitted = true;
        submitBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
        renderAllMarkers(true);
    }

    function handleEdit() {
        if (!confirm('確定要修改答案嗎？')) return;
        isSubmitted = false;
        submitBtn.classList.remove('hidden');
        editBtn.classList.add('hidden');
        renderAllMarkers(false);
    }
    
    function adjustBoxPosition(box, marker, container) {
        box.style.visibility = 'hidden';
        box.style.display = 'block';
        const cRect = container.getBoundingClientRect(), mRect = marker.getBoundingClientRect(), bRect = box.getBoundingClientRect();
        let top = mRect.bottom - cRect.top + 10, left = mRect.left - cRect.left + (mRect.width / 2) - (bRect.width / 2);
        if (top + bRect.height > cRect.height && mRect.top - cRect.top > bRect.height) top = mRect.top - cRect.top - bRect.height - 10;
        if (left < 0) left = 5;
        if (left + bRect.width > cRect.width) left = cRect.width - bRect.width - 5;
        if (top < 0) top = 5;
        if (top + bRect.height > cRect.height) top = cRect.height - bRect.height - 5;
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        box.style.visibility = 'visible';
    }

    initializeSelectors();
});
