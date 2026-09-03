document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');
    const classFilter = document.getElementById('class-filter');

    let allSubmissions = [];
    let classSet = new Set(['all']); // 預先加入 'all'
    let currentlyOpenExplanation = null; // 用一個變數追蹤當前打開的解釋框

    classFilter.addEventListener('change', renderGroupList);

    db.collection('submissions').onSnapshot(snapshot => {
        allSubmissions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allSubmissions.push(data);
            if (data.className) {
                classSet.add(data.className);
            }
        });

        // 確保在資料完全處理後才更新 UI
        updateClassFilter();
        renderGroupList();
    });
    
    function updateClassFilter() {
        const currentSelection = classFilter.value;
        const sortedClasses = Array.from(classSet).filter(c => c !== 'all').sort();
        
        // 先清空，但保留第一個 "所有班級" 選項
        while (classFilter.options.length > 1) {
            classFilter.remove(1);
        }

        sortedClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className + '班';
            classFilter.appendChild(option);
        });

        // 恢復之前的選擇
        if (Array.from(classFilter.options).some(opt => opt.value === currentSelection)) {
            classFilter.value = currentSelection;
        } else {
            classFilter.value = 'all';
        }
    }

    function renderGroupList() {
        groupList.innerHTML = '';
        const selectedClass = classFilter.value;

        const filteredSubmissions = allSubmissions.filter(sub => selectedClass === 'all' || sub.className === selectedClass);
        
        if (filteredSubmissions.length === 0 && selectedClass !== 'all') {
            groupList.innerHTML = `<p>班級 ${selectedClass} 尚未有組別提交。</p>`;
            return;
        }

        filteredSubmissions.sort((a, b) => {
            if (a.className < b.className) return -1;
            if (a.className > b.className) return 1;
            return a.groupNum - b.groupNum;
        });

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
        currentlyOpenExplanation = null; // 切換組別時重置

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
            
            // *** 核心 Bug 修復：重寫點擊事件，增強兼容性 ***
            markerDiv.addEventListener('click', (e) => {
                e.stopPropagation();

                // 情況 1：如果點擊的正是當前已打開的，則關閉它
                if (currentlyOpenExplanation === explanationDiv) {
                    explanationDiv.classList.remove('visible');
                    currentlyOpenExplanation = null;
                } 
                // 情況 2：如果點擊的是一個新的標示
                else {
                    // 先關閉之前可能已打開的
                    if (currentlyOpenExplanation) {
                        currentlyOpenExplanation.classList.remove('visible');
                    }
                    // 打開新的這一個，並計算位置
                    explanationDiv.classList.add('visible');
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                    // 更新追蹤變數
                    currentlyOpenExplanation = explanationDiv;
                }
            });

            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        imageContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.submission-marker') && currentlyOpenExplanation) {
                currentlyOpenExplanation.classList.remove('visible');
                currentlyOpenExplanation = null;
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
