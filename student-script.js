document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('class-select');
    const groupSelect = document.getElementById('group-select');
    const startBtn = document.getElementById('start-btn');
    const loginView = document.getElementById('login-view');
    const activityView = document.getElementById('activity-view');
    const infoHeader = document.getElementById('info-header');
    const imageContainer = document.getElementById('image-container');
    const activityImage = document.getElementById('activity-image');
    const submitBtn = document.getElementById('submit-btn');
    const editBtn = document.getElementById('edit-btn');

    let studentInfo = {};
    let markers = []; 
    let isSubmitted = false;

    // --- 初始化 (不變) ---
    const classes = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D', '4A', '4B', '4C', '4D', '5A', '5B', '5C', '5D', '6A', '6B', '6C', '6D'];
    classes.forEach(c => { const option = document.createElement('option'); option.value = c; option.textContent = c + '班'; classSelect.appendChild(option); });
    for (let i = 1; i <= 10; i++) { const option = document.createElement('option'); option.value = i; option.textContent = `第${i}組`; groupSelect.appendChild(option); }
    // -------------------

    startBtn.addEventListener('click', () => {
        studentInfo = { className: classSelect.value, groupNum: parseInt(groupSelect.value) };
        studentInfo.docId = `${studentInfo.className}-${studentInfo.groupNum}`;
        loginView.style.display = 'none';
        activityView.style.display = 'block';
        const imageNum = (studentInfo.groupNum - 1) % 6 + 1;
        studentInfo.imageNum = imageNum;
        activityImage.src = `images/lab_safety_${imageNum}.png`;
        infoHeader.textContent = `${studentInfo.className}班 第${studentInfo.groupNum}組`;
        loadExistingSubmission();
    });

    async function loadExistingSubmission() {
        const docRef = db.collection('submissions').doc(studentInfo.docId);
        const doc = await docRef.get();
        if (doc.exists) {
            isSubmitted = true;
            submitBtn.style.display = 'none';
            editBtn.style.display = 'block';
            alert('偵測到您已提交過答案，將載入您先前的作答。');
            markers = doc.data().markers;
            renderAllMarkers(true, true);
            lockAllMarkers(true);
        }
    }

    imageContainer.addEventListener('click', (e) => {
        if (isSubmitted || e.target.closest('.marker') || e.target.closest('.explanation-box')) return;
        const rect = imageContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const markerData = { id: Date.now(), x, y, explanation: '' };
        markers.push(markerData);
        renderAllMarkers();
    });
    
    function renderAllMarkers(isLocked = false, isInitiallyHidden = true) {
        imageContainer.querySelectorAll('.marker, .explanation-box').forEach(el => el.remove());
        markers.forEach((markerData, index) => {
            const isLast = (index === markers.length - 1);
            // 只有最新加入的標示的解釋框會預設打開
            createMarker(markerData, index + 1, isLocked, !isLast);
        });
    }

    function createMarker(markerData, index, isLocked, isInitiallyHidden) {
        const markerDiv = document.createElement('div');
        markerDiv.className = 'marker';
        markerDiv.style.left = `${markerData.x}%`;
        markerDiv.style.top = `${markerData.y}%`;
        markerDiv.textContent = index;
        markerDiv.dataset.id = markerData.id; // 綁定 ID
        
        const explanationBox = document.createElement('div');
        explanationBox.className = 'explanation-box';
        explanationBox.dataset.id = markerData.id; // 綁定 ID
        if (isInitiallyHidden) explanationBox.classList.add('hidden');
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = '請在此輸入解釋...';
        textarea.value = markerData.explanation;
        textarea.disabled = isLocked;
        textarea.oninput = () => { markerData.explanation = textarea.value; };

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'explanation-controls';

        const hideBtn = document.createElement('button');
        hideBtn.className = 'hide-btn';
        hideBtn.textContent = '隱藏';
        hideBtn.onclick = () => { explanationBox.classList.add('hidden'); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '刪除';
        deleteBtn.onclick = () => {
            if (confirm('確定要刪除這個標示嗎？')) {
                markers = markers.filter(m => m.id !== markerData.id);
                renderAllMarkers(isSubmitted, true);
            }
        };

        controlsDiv.appendChild(hideBtn);
        controlsDiv.appendChild(deleteBtn);
        explanationBox.appendChild(textarea);
        explanationBox.appendChild(controlsDiv);
        imageContainer.appendChild(markerDiv);
        imageContainer.appendChild(explanationBox);

        markerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            explanationBox.classList.remove('hidden');
            adjustBoxPosition(explanationBox, markerDiv, imageContainer);
        });

        if (!isInitiallyHidden) {
             adjustBoxPosition(explanationBox, markerDiv, imageContainer);
        }
    }

    function adjustBoxPosition(box, marker, container) {
        const containerRect = container.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        let top = markerRect.top - containerRect.top + markerRect.height;
        let left = markerRect.left - containerRect.left + markerRect.width / 2;
        const boxWidth = 250;
        const boxHeight = 150;
        if (left + boxWidth > containerRect.width) left = containerRect.width - boxWidth - 5;
        if (left < 0) left = 5;
        if (top + boxHeight > containerRect.height) top = markerRect.top - containerRect.top - boxHeight - 5;
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
    }

    // *** 核心修改：提交按鈕的事件 ***
    submitBtn.addEventListener('click', async () => {
        // 1. 清除之前所有的錯誤提示
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // 2. 找出所有未完成的標示
        const incompleteMarkers = markers.filter(m => !m.explanation.trim());

        if (incompleteMarkers.length > 0) {
            alert('您有尚未完成的解釋，請補充！系統已將其標示出來。');
            
            // 3. 遍歷未完成的標示，並「點亮」它們
            incompleteMarkers.forEach(markerData => {
                const markerId = markerData.id;
                // 找到對應的 DOM 元素
                const markerDiv = document.querySelector(`.marker[data-id="${markerId}"]`);
                const explanationBox = document.querySelector(`.explanation-box[data-id="${markerId}"]`);
                const textarea = explanationBox.querySelector('textarea');

                // 加上錯誤 class
                if (markerDiv) markerDiv.classList.add('error');
                if (textarea) textarea.classList.add('error');

                // 自動打開解釋框
                if (explanationBox) {
                    explanationBox.classList.remove('hidden');
                    adjustBoxPosition(explanationBox, markerDiv, imageContainer);
                }
            });
            return; // 中斷提交流程
        }

        if (markers.length === 0) return alert('請至少標示一個危險之處！');
        
        // 4. 如果所有檢查都通過，則正常提交
        try {
            await db.collection('submissions').doc(studentInfo.docId).set({ className: studentInfo.className, groupNum: studentInfo.groupNum, imageNum: studentInfo.imageNum, markers: markers, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            alert('提交成功！');
            isSubmitted = true;
            submitBtn.style.display = 'none';
            editBtn.style.display = 'block';
            lockAllMarkers(true);
            document.querySelectorAll('.explanation-box').forEach(box => box.classList.add('hidden'));
        } catch (error) {
            console.error("提交失敗: ", error);
            alert('提交失敗，請檢查網絡或聯絡老師。');
        }
    });

    editBtn.addEventListener('click', () => {
        if (confirm('確定要修改答案嗎？修改後需要重新提交。')) {
            isSubmitted = false;
            submitBtn.textContent = '更新答案';
            submitBtn.style.display = 'block';
            editBtn.style.display = 'none';
            renderAllMarkers(false, true);
            lockAllMarkers(false);
            // 清除可能存在的錯誤提示
            document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        }
    });
    
    function lockAllMarkers(lock) {
        document.querySelectorAll('.explanation-box textarea').forEach(area => { area.disabled = lock; });
        document.querySelectorAll('.explanation-box .delete-btn').forEach(btn => { btn.style.display = lock ? 'none' : 'block'; });
    }
});
