document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');
    const classFilter = document.getElementById('class-filter');

    let allSubmissions = []; // 存儲所有提交的原始數據

    // --- iPad 篩選器修正 ---
    // 監聽 Firebase 數據的實時變化
    db.collection('submissions').onSnapshot(snapshot => {
        allSubmissions = [];
        const classSet = new Set(); // 每次都重新計算班級列表

        snapshot.forEach(doc => {
            const data = doc.data();
            allSubmissions.push(data);
            if (data.className) {
                classSet.add(data.className);
            }
        });
        
        // **策略：徹底重置並重建 HTML，強制 iPad/Safari 重新渲染**
        const sortedClasses = Array.from(classSet).sort();
        let optionsHtml = '<option value="all">所有班級</option>'; // 從一個包含預設選項的字串開始
        sortedClasses.forEach(className => {
            optionsHtml += `<option value="${className}">${className}班</option>`;
        });
        classFilter.innerHTML = optionsHtml; // 用全新的 HTML 內容替換整個選單

        renderGroupList(); // 根據當前篩選器（預設為 'all'）重新渲染組別列表
    });

    // 當用戶手動改變篩選器時，重新渲染組別列表
    classFilter.addEventListener('change', renderGroupList);

    function renderGroupList() {
        groupList.innerHTML = '';
        const selectedClass = classFilter.value;
        const filtered = allSubmissions.filter(sub => selectedClass === 'all' || sub.className === selectedClass);

        if (filtered.length === 0) {
            groupList.innerHTML = selectedClass === 'all' ? '<p>正在等待學生提交...</p>' : `<p>班級 ${selectedClass} 尚未有組別提交。</p>`;
            return;
        }

        filtered.sort((a, b) => {
            if (a.className < b.className) return -1;
            if (a.className > b.className) return 1;
            return a.groupNum - b.groupNum;
        });

        filtered.forEach(submission => {
            const button = document.createElement('button');
            button.className = 'group-button';
            button.textContent = `${submission.className}班 - 第${submission.groupNum}組`;
            button.onclick = () => {
                // 清理工作：確保切換組別時，之前的答案會被清空
                submissionContent.innerHTML = '<h2 id="submission-header">請選擇一個組別來查看答案</h2>';
                displaySubmission(submission);
                document.querySelectorAll('.group-button.active').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            };
            groupList.appendChild(button);
        });
    }

    function displaySubmission(submission) {
        submissionHeader.textContent = `${submission.className}班 - 第${submission.groupNum}組的答案`;
        submissionContent.innerHTML = '';

        const imageContainer = document.createElement('div');
        imageContainer.id = 'image-container';
        const img = document.createElement('img');
        img.src = `images/lab_safety_${submission.imageNum}.png`;
        img.id = 'activity-image';
        imageContainer.appendChild(img);

        submission.markers.forEach((marker, index) => {
            const markerDiv = document.createElement('div');
            markerDiv.className = 'submission-marker';
            markerDiv.style.left = `${marker.x}%`;
            markerDiv.style.top = `${marker.y}%`;
            markerDiv.textContent = index + 1;
            
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'submission-explanation';
            explanationDiv.textContent = marker.explanation;
            
            // --- 電腦版無法隱藏 Bug 修正 ---
            // **策略：採用最簡單直接的狀態切換，避免複雜的事件依賴**
            markerDiv.addEventListener('click', (e) => {
                e.stopPropagation();

                const isVisible = explanationDiv.classList.contains('visible');

                // 步驟 1: 關閉所有可見的解釋框
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                    box.classList.remove('visible');
                });
                
                // 步驟 2: 如果剛剛點擊的這個框是關閉的，就打開它
                if (!isVisible) {
                    explanationDiv.classList.add('visible');
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                }
            });
            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        imageContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.submission-marker')) {
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                    box.classList.remove('visible');
                });
            }
        });
        submissionContent.appendChild(imageContainer);
    }

    function adjustBoxPosition(box, marker, container) {
        box.style.visibility = 'hidden';
        box.style.display = 'block';
        const containerRect = container.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();
        let top = markerRect.bottom - containerRect.top + 10;
        let left = markerRect.left - containerRect.left + (markerRect.width / 2) - (boxRect.width / 2);
        if (top + boxRect.height > containerRect.height && markerRect.top - containerRect.top > boxRect.height) {
            top = markerRect.top - containerRect.top - boxRect.height - 10;
        }
        if (left < 0) left = 5;
        if (left + boxRect.width > containerRect.width) left = containerRect.width - boxRect.width - 5;
        if (top < 0) top = 5;
        if (top + boxRect.height > containerRect.height) top = containerRect.height - boxRect.height - 5;
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        box.style.visibility = 'visible';
    }
});
