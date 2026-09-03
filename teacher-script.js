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
            explanationDiv.style.left = `${marker.x}%`;
            explanationDiv.style.top = `${marker.y}%`;
            // 預設放在標示下方
            explanationDiv.style.transform = `translate(-50%, 30px)`; 
            explanationDiv.textContent = marker.explanation;
            
            // *** 核心 Bug 修復 ***
            markerDiv.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止點到圖片

                // 點擊別的數字時，先關掉已打開的
                const currentlyVisible = imageContainer.querySelector('.submission-explanation.visible');
                if (currentlyVisible && currentlyVisible !== explanationDiv) {
                    currentlyVisible.classList.remove('visible');
                }
                
                // 切換當前點擊的這一個
                explanationDiv.classList.toggle('visible');
            });

            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        // 點擊圖片任何地方，關閉所有解釋框
        imageContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.submission-marker')) {
                imageContainer.querySelectorAll('.submission-explanation.visible').forEach(box => {
                    box.classList.remove('visible');
                });
            }
        });

        submissionContent.appendChild(imageContainer);
    }
});
