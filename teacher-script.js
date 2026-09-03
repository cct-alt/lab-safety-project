document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');
    const submissionControls = document.getElementById('submission-controls');
    const classFilter = document.getElementById('class-filter');

    let allSubmissions = [];

    db.collection('submissions').onSnapshot(snapshot => {
        allSubmissions = [];
        const classSet = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allSubmissions.push(data);
            if (data.className) classSet.add(data.className);
        });
        
        setTimeout(() => {
            const currentSelection = classFilter.value;
            const sortedClasses = Array.from(classSet).sort();
            let optionsHtml = '<option value="all">所有班級</option>';
            sortedClasses.forEach(className => optionsHtml += `<option value="${className}">${className}班</option>`);
            classFilter.innerHTML = optionsHtml;
            if (Array.from(classFilter.options).some(opt => opt.value === currentSelection)) {
                classFilter.value = currentSelection;
            }
            renderGroupList();
        }, 50);
    });

    classFilter.addEventListener('change', renderGroupList);

    function renderGroupList() {
        // ... (這部分邏輯不變，保持原樣)
        const selectedClass = classFilter.value;
        const filtered = allSubmissions.filter(sub => selectedClass === 'all' || sub.className === selectedClass);
        filtered.sort((a, b) => (a.className.localeCompare(b.className)) || (a.groupNum - b.groupNum));
        groupList.innerHTML = '';
        if (filtered.length === 0) {
            groupList.innerHTML = selectedClass === 'all' ? '<p>正在等待學生提交...</p>' : `<p>班級 ${selectedClass} 尚未有組別提交。</p>`;
            return;
        }
        filtered.forEach(submission => {
            const button = document.createElement('button');
            button.className = 'group-button';
            button.textContent = `${submission.className}班 - 第${submission.groupNum}組`;
            button.onclick = () => {
                displaySubmission(submission);
                document.querySelectorAll('.group-button.active').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            };
            groupList.appendChild(button);
        });
    }

    function displaySubmission(submission) {
        // --- 每次顯示都重置所有內容，確保乾淨的開始 ---
        submissionHeader.textContent = `${submission.className}班 - 第${submission.groupNum}組的答案`;
        submissionContent.innerHTML = '';
        submissionControls.innerHTML = '';

        // --- 創建刪除按鈕 ---
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-submission-btn';
        deleteBtn.textContent = '刪除此提交';
        deleteBtn.onclick = () => {
            if (confirm(`確定要永久刪除「${submission.className}班 - 第${submission.groupNum}組」的答案嗎？`)) {
                db.collection('submissions').doc(submission.id).delete().then(() => {
                    alert('刪除成功！');
                    submissionHeader.textContent = '請選擇一個組別來查看答案';
                    submissionContent.innerHTML = '';
                    submissionControls.innerHTML = '';
                });
            }
        };
        submissionControls.appendChild(deleteBtn);

        // --- 創建圖片容器 ---
        const imageContainer = document.createElement('div');
        imageContainer.id = 'image-container';
        const img = document.createElement('img');
        img.src = `images/lab_safety_${submission.imageNum}.png`;
        imageContainer.appendChild(img);
        
        // --- 創建所有標示和解釋框 ---
        submission.markers.forEach((marker, index) => {
            const markerDiv = document.createElement('div');
            markerDiv.className = 'submission-marker';
            markerDiv.style.left = `${marker.x}%`;
            markerDiv.style.top = `${marker.y}%`;
            markerDiv.textContent = index + 1;
            
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'submission-explanation';
            explanationDiv.textContent = marker.explanation;
            
            // 建立唯一關聯
            const uniqueId = `explanation-${marker.id}`;
            markerDiv.dataset.targetId = uniqueId;
            explanationDiv.id = uniqueId;

            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        submissionContent.appendChild(imageContainer);

        // --- 終極修正：單一事件委派監聽器 ---
        imageContainer.addEventListener('click', function(e) {
            const clickedMarker = e.target.closest('.submission-marker');

            // 如果點擊的不是 marker，就簡單地關閉所有已打開的解釋框
            if (!clickedMarker) {
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                    box.classList.remove('visible');
                });
                return;
            }

            // 如果點擊的是 marker
            const targetId = clickedMarker.dataset.targetId;
            const targetExplanation = document.getElementById(targetId);

            if (!targetExplanation) return;
            
            const wasVisible = targetExplanation.classList.contains('visible');

            // 步驟 1: 無條件關閉所有已打開的解釋框
            imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                box.classList.remove('visible');
            });

            // 步驟 2: 如果剛剛點擊的這個框之前是關閉的，就打開它
            if (!wasVisible) {
                targetExplanation.classList.add('visible');
                adjustBoxPosition(targetExplanation, clickedMarker, imageContainer);
            }
        });
    }

    function adjustBoxPosition(box, marker, container) {
        // ... (這個函式不變，保持原樣)
        box.style.visibility = 'hidden';
        box.style.display = 'block';
        const cRect = container.getBoundingClientRect();
        const mRect = marker.getBoundingClientRect();
        const bRect = box.getBoundingClientRect();
        let top = mRect.bottom - cRect.top + 10;
        let left = mRect.left - cRect.left + (mRect.width / 2) - (bRect.width / 2);
        if (top + bRect.height > cRect.height && mRect.top - cRect.top > bRect.height) { top = mRect.top - cRect.top - bRect.height - 10; }
        if (left < 0) left = 5;
        if (left + bRect.width > cRect.width) { left = cRect.width - bRect.width - 5; }
        if (top < 0) top = 5;
        if (top + bRect.height > cRect.height) { top = cRect.height - bRect.height - 5; }
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        box.style.visibility = 'visible';
        box.style.display = ''; // 清除 display: block
        box.classList.add('visible'); // 重新加上 visible
    }
});
