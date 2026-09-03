document.addEventListener('DOMContentLoaded', function() {
    const groupList = document.getElementById('group-list');
    const submissionHeader = document.getElementById('submission-header');
    const submissionContent = document.getElementById('submission-content');

    db.collection('submissions').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            groupList.innerHTML = '<p>正在等待學生提交...</p>';
            return;
        }
        groupList.innerHTML = '';
        snapshot.forEach(doc => {
            const submission = doc.data();
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
    });

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

                const currentlyVisible = imageContainer.querySelector('.submission-explanation.visible');
                if (currentlyVisible && currentlyVisible !== explanationDiv) {
                    currentlyVisible.classList.remove('visible');
                }
                
                // 切換顯示狀態
                const isNowVisible = explanationDiv.classList.toggle('visible');

                // *** 核心 Bug 修復：如果解釋框變為可見，則調整其位置 ***
                if (isNowVisible) {
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

    // *** 新增：從學生版移植過來的智慧定位函式 ***
    function adjustBoxPosition(box, marker, container) {
        // 為了準確計算，先讓它顯示出來 (但透明)，計算完再恢復
        box.style.visibility = 'hidden';
        box.style.display = 'block';

        const containerRect = container.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();

        // 預設位置：在標示的右下方
        let top = markerRect.top - containerRect.top + 30; // 往下30px
        let left = markerRect.left - containerRect.left + 15; // 往右15px

        // 檢查右邊界：如果超出，則將解釋框移到標示的左側
        if (left + boxRect.width > containerRect.width) {
            left = markerRect.left - containerRect.left - boxRect.width - 15;
        }
        // 檢查左邊界：如果超出，則移回標示的右側
        if (left < 0) {
            left = markerRect.left - containerRect.left + 15;
        }
        // 檢查下邊界：如果超出，則將解釋框移到標示的上方
        if (top + boxRect.height > containerRect.height) {
            top = markerRect.top - containerRect.top - boxRect.height - 15;
        }
         // 檢查上邊界：如果超出，則移回標示的下方
        if (top < 0) {
            top = markerRect.top - containerRect.top + 30;
        }

        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        
        // 計算完成後，恢復正常顯示
        box.style.visibility = 'visible';
    }
});
