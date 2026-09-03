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
            // 核心修改 1：儲存 Firebase 的 document ID，作為後續刪除的依據
            data.id = doc.id; 
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

        // --- 核心修改 2：建立刪除按鈕區域 ---
        const actionContainer = document.createElement('div');
        actionContainer.style.textAlign = 'right';
        actionContainer.style.marginBottom = '10px';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ 刪除此答案';
        // 使用行內樣式，不需要額外修改 CSS 檔案
        deleteBtn.style.backgroundColor = '#dc3545';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.padding = '8px 15px';
        deleteBtn.style.borderRadius = '5px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '14px';

        // 刪除按鈕的事件處理
        const handleDelete = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 彈出確認視窗，避免誤觸
            if (confirm(`確定要刪除 ${submission.className}班 第${submission.groupNum}組 的答案嗎？\n此操作無法復原。`)) {
                // 呼叫 Firebase 刪除資料
                db.collection('submissions').doc(submission.id).delete().then(() => {
                    submissionHeader.textContent = '已刪除';
                    submissionContent.innerHTML = '<p>答案已成功刪除，請從左側重新選擇其他組別。</p>';
                }).catch((error) => {
                    console.error("刪除失敗: ", error);
                    alert("刪除失敗，請檢查網路連線。");
                });
            }
        };

        // 綁定電腦與 iPad 事件
        deleteBtn.addEventListener('click', handleDelete);
        deleteBtn.addEventListener('touchend', handleDelete);
        actionContainer.appendChild(deleteBtn);
        submissionContent.appendChild(actionContainer);
        // -----------------------------------

        const imageContainer = document.createElement('div');
        imageContainer.id = 'image-container';
        imageContainer.style.cursor = 'pointer'; 
        imageContainer.style.WebkitTapHighlightColor = 'transparent';

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
            markerDiv.style.cursor = 'pointer';
            
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'submission-explanation';
            explanationDiv.textContent = marker.explanation;
            
            const handleToggle = (e) => {
                e.preventDefault();
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

            markerDiv.addEventListener('click', handleToggle);
            markerDiv.addEventListener('touchend', handleToggle);
            
            const stopProp = (e) => e.stopPropagation();
            explanationDiv.addEventListener('click', stopProp);
            explanationDiv.addEventListener('touchend', stopProp);

            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        const closeAnyOpenBox = (e) => {
            if(e.target.classList.contains('submission-marker') || e.target.classList.contains('submission-explanation')) return;
            
            if (currentlyOpenBox) {
                currentlyOpenBox.classList.remove('visible');
                currentlyOpenBox = null;
            }
        };

        imageContainer.addEventListener('click', closeAnyOpenBox);
        imageContainer.addEventListener('touchend', closeAnyOpenBox);
        
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
