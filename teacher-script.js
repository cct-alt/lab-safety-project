document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');
    const classFilter = document.getElementById('class-filter');

    let allSubmissions = []; // 用於存儲從 Firebase 獲取的所有數據
    let classSet = new Set(); // 用於存儲所有出現過的班級

    // 監聽篩選器的變化
    classFilter.addEventListener('change', () => {
        renderGroupList();
    });

    db.collection('submissions').onSnapshot(snapshot => {
        if (snapshot.empty) {
            groupList.innerHTML = '<p>正在等待學生提交...</p>';
            return;
        }
        
        allSubmissions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allSubmissions.push(data);
            if (data.className) {
                classSet.add(data.className);
            }
        });

        updateClassFilter();
        renderGroupList();
    });
    
    // 更新班級篩選器選項
    function updateClassFilter() {
        const sortedClasses = Array.from(classSet).sort();
        // 保留 "所有班級" 選項
        classFilter.innerHTML = '<option value="all">所有班級</option>';
        sortedClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className + '班';
            classFilter.appendChild(option);
        });
    }

    // 渲染組別列表（包含排序和篩選邏輯）
    function renderGroupList() {
        groupList.innerHTML = '';
        const selectedClass = classFilter.value;

        // 1. 篩選
        const filteredSubmissions = allSubmissions.filter(sub => {
            return selectedClass === 'all' || sub.className === selectedClass;
        });
        
        if (filteredSubmissions.length === 0) {
            groupList.innerHTML = `<p>班級 ${selectedClass} 尚未有組別提交。</p>`;
            return;
        }

        // 2. 排序 (按班級，再按組號)
        filteredSubmissions.sort((a, b) => {
            if (a.className < b.className) return -1;
            if (a.className > b.className) return 1;
            return a.groupNum - b.groupNum;
        });

        // 3. 渲染
        filteredSubmissions.forEach(submission => {
            const button = document.createElement('button');
            button.className = 'group-button';
            button.textContent = `${submission.className}班 - 第${submission.groupNum}組`;
            button.onclick = () => {
                displaySubmission(submission);
                document.querySelectorAll('.group-button').forEach(btn => btn.classList.remove('active'));
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
            
            markerDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasVisible = explanationDiv.classList.contains('visible');
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => box.classList.remove('visible'));
                if (!wasVisible) {
                    explanationDiv.classList.add('visible');
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                }
            });
            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        imageContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.submission-marker')) {
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => box.classList.remove('visible'));
            }
        });
        submissionContent.appendChild(imageContainer);
    }

    // *** 核心 Bug 修復：重寫 adjustBoxPosition 函式 ***
    function adjustBoxPosition(box, marker, container) {
        // 為了準確計算，先讓它可見但透明
        box.style.visibility = 'hidden';
        box.style.display = 'block';

        const containerRect = container.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();

        // 預設位置：在標示下方
        let top = markerRect.bottom - containerRect.top + 10; // 往下 10px
        let left = markerRect.left - containerRect.left + (markerRect.width / 2) - (boxRect.width / 2); // 水平置中

        // --- 智慧定位邏輯 ---
        // 1. 如果下方空間不足，但上方空間足夠，則移到上方
        if (top + boxRect.height > containerRect.height && markerRect.top - containerRect.top > boxRect.height) {
            top = markerRect.top - containerRect.top - boxRect.height - 10; // 往上 10px
        }
        // 2. 修正水平位置，確保不超出左右邊界
        if (left < 0) {
            left = 5; // 離左邊界 5px
        }
        if (left + boxRect.width > containerRect.width) {
            left = containerRect.width - boxRect.width - 5; // 離右邊界 5px
        }
         // 3. 再次修正垂直位置，確保不會因為水平移動而出界
        if (top < 0) {
            top = 5;
        }
        if (top + boxRect.height > containerRect.height) {
            top = containerRect.height - boxRect.height - 5;
        }
        
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        
        // 計算完成後，恢復正常顯示
        box.style.visibility = 'visible';
    }
});
