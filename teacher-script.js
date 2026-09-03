document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');
    const classFilter = document.getElementById('class-filter');

    let allSubmissions = []; 
    let currentlyOpenBox = null; 

    db.collection('submissions').onSnapshot(snapshot => {
        allSubmissions = [];
        const classSet = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            allSubmissions.push(data);
            if (data.className) {
                classSet.add(data.className);
            }
        });

        setTimeout(() => {
            const currentSelection = classFilter.value;
            const sortedClasses = Array.from(classSet).sort();
            
            let optionsHtml = '<option value="all">所有班級</option>';
            sortedClasses.forEach(className => {
                optionsHtml += `<option value="${className}">${className}班</option>`;
            });
            classFilter.innerHTML = optionsHtml;

            if (Array.from(classFilter.options).some(opt => opt.value === currentSelection)) {
                classFilter.value = currentSelection;
            }
            renderGroupList();
        }, 10); 
    });

    classFilter.addEventListener('change', renderGroupList);

    function renderGroupList() {
        const selectedClass = classFilter.value;
        const filtered = allSubmissions.filter(sub => selectedClass === 'all' || sub.className === selectedClass);

        filtered.sort((a, b) => {
            if (a.className < b.className) return -1;
            if (a.className > b.className) return 1;
            return a.groupNum - b.groupNum;
        });

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
        submissionHeader.textContent = `${submission.className}班 - 第${submission.groupNum}組的答案`;
        submissionContent.innerHTML = ''; 
        currentlyOpenBox = null; 

        const imageContainer = document.createElement('div');
        imageContainer.id = 'image-container';
        
        // --- 針對 iPad 的核心修復 ---
        // 強制讓 iOS Safari 認知此容器是可點擊的，確保點擊背景能順利關閉視窗
        imageContainer.style.cursor = 'pointer'; 
        imageContainer.style.WebkitTapHighlightColor = 'transparent'; // 移除點擊閃爍

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
            
            // 點擊事件處理
            const handleToggle = (e) => {
                e.preventDefault(); // 阻止 iOS 預設行為
                e.stopPropagation();

                if (currentlyOpenBox === explanationDiv) {
                    explanationDiv.classList.remove('visible');
                    currentlyOpenBox = null; 
                } else {
                    if (currentlyOpenBox) {
                        currentlyOpenBox.classList.remove('visible');
                    }
                    explanationDiv.classList.add('visible');
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                    currentlyOpenBox = explanationDiv; 
                }
            };

            // 為了最大相容性，使用 click 即可，前面的 cursor: pointer 已解決背景問題
            markerDiv.addEventListener('click', handleToggle);
            
            // 防止點擊解釋框內部文字時關閉視窗
            explanationDiv.addEventListener('click', (e) => e.stopPropagation());

            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        // 點擊背景隱藏
        imageContainer.addEventListener('click', () => {
            if (currentlyOpenBox) {
                currentlyOpenBox.classList.remove('visible');
                currentlyOpenBox = null;
            }
        });
        
        submissionContent.appendChild(imageContainer);
    }

    function adjustBoxPosition(box, marker, container) {
        const cRect = container.getBoundingClientRect();
        const mRect = marker.getBoundingClientRect();
        const bRect = box.getBoundingClientRect();

        let top, left;

        top = mRect.bottom - cRect.top + 10;
        left = mRect.left - cRect.left + (mRect.width / 2) - (bRect.width / 2);

        if (top + bRect.height > cRect.height && (mRect.top - cRect.top) > bRect.height) {
            top = mRect.top - cRect.top - bRect.height - 10;
        }

        if (left < 0) left = 5;
        if (left + bRect.width > cRect.width) left = cRect.width - bRect.width - 5;
        if (top < 0) top = 5;
        if (top + bRect.height > cRect.height) top = cRect.height - bRect.height - 5;

        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
    }
});
