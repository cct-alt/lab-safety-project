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
            
            // *** 核心 Bug 修復：重新組織點擊事件邏輯 ***
            markerDiv.addEventListener('click', (e) => {
                e.stopPropagation();

                // 1. 檢查當前點擊的解釋框是否已經可見
                const wasAlreadyVisible = explanationDiv.classList.contains('visible');

                // 2. 無論如何，都先關閉所有其他已打開的解釋框
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                    box.classList.remove('visible');
                });
                
                // 3. 根據它之前的狀態來決定下一步
                if (!wasAlreadyVisible) {
                    // 如果它之前是關閉的，現在就打開它
                    explanationDiv.classList.add('visible');
                    // 並且只有在打開時才計算位置
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                }
                // 如果它之前是打開的，經過第2步已經被關閉了，所以這裡什麼都不用做。
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
        let top = markerRect.top - containerRect.top + 30;
        let left = markerRect.left - containerRect.left + 15;
        if (left + boxRect.width > containerRect.width) {
            left = markerRect.left - containerRect.left - boxRect.width - 15;
        }
        if (left < 0) {
            left = markerRect.left - containerRect.left + 15;
        }
        if (top + boxRect.height > containerRect.height) {
            top = markerRect.top - containerRect.top - boxRect.height - 15;
        }
        if (top < 0) {
            top = markerRect.top - containerRect.top + 30;
        }
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        box.style.visibility = 'visible';
        box.style.display = ''; // 清除 display: block
    }
});
