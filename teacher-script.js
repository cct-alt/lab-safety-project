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
            const data = doc.data(); data.id = doc.id; allSubmissions.push(data);
            if (data.className) classSet.add(data.className);
        });
        setTimeout(() => {
            const sortedClasses = Array.from(classSet).sort();
            let optionsHtml = '<option value="all">所有班級</option>';
            sortedClasses.forEach(className => optionsHtml += `<option value="${className}">${className}班</option>`);
            classFilter.innerHTML = optionsHtml;
            renderGroupList();
        }, 100);
    });

    classFilter.addEventListener('change', renderGroupList);

    function renderGroupList() {
        const selectedClass = classFilter.value;
        const filtered = allSubmissions.filter(sub => selectedClass === 'all' || sub.className === selectedClass);
        filtered.sort((a, b) => (a.className.localeCompare(b.className)) || (a.groupNum - b.groupNum));
        groupList.innerHTML = '';
        if (filtered.length === 0) {
            groupList.innerHTML = `<p>無提交記錄</p>`;
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
        submissionControls.innerHTML = '';

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
                const wasVisible = explanationDiv.style.display === 'block';
                imageContainer.querySelectorAll('.submission-explanation').forEach(box => box.style.display = 'none');
                if (!wasVisible) {
                    explanationDiv.style.display = 'block';
                    adjustBoxPosition(explanationDiv, markerDiv, imageContainer);
                }
            });
            imageContainer.appendChild(markerDiv);
            imageContainer.appendChild(explanationDiv);
        });
        
        imageContainer.addEventListener('click', e => {
            if (!e.target.closest('.submission-marker')) {
                imageContainer.querySelectorAll('.submission-explanation').forEach(box => box.style.display = 'none');
            }
        });
        submissionContent.appendChild(imageContainer);
    }
    
    function adjustBoxPosition(box, marker, container) {
        box.style.visibility = 'hidden';
        box.style.display = 'block';
        const cRect = container.getBoundingClientRect(), mRect = marker.getBoundingClientRect(), bRect = box.getBoundingClientRect();
        let top = mRect.bottom - cRect.top + 10, left = mRect.left - cRect.left + (mRect.width / 2) - (bRect.width / 2);
        if (top + bRect.height > cRect.height && mRect.top - cRect.top > bRect.height) top = mRect.top - cRect.top - bRect.height - 10;
        if (left < 0) left = 5;
        if (left + bRect.width > cRect.width) left = cRect.width - bRect.width - 5;
        if (top < 0) top = 5;
        if (top + bRect.height > cRect.height) top = cRect.height - bRect.height - 5;
        box.style.top = `${top}px`;
        box.style.left = `${left}px`;
        box.style.visibility = 'visible';
    }
});
