```javascript
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const CONFIG = {
        totalFrames: 13,
        imagePath: "./imagens/perfume-",
        imageExtension: ".jpg",
        framePadding: 3,
        pixelsPerFrame: 12
    };

    const container = document.getElementById("spin-container");
    const image = document.getElementById("myImg");

    if (!container || !image) {
        console.error(
            "Spin 360: #spin-container ou #myImg não encontrado."
        );
        return;
    }

    let currentFrame = 1;
    let lastX = 0;
    let accumulatedDistance = 0;
    let isDragging = false;
    let activePointerId = null;

    const preloadedImages = [];

    function getFrameUrl(frame) {
        const paddedFrame = String(frame).padStart(
            CONFIG.framePadding,
            "0"
        );

        return (
            CONFIG.imagePath +
            paddedFrame +
            CONFIG.imageExtension
        );
    }

    function preloadImages() {
        for (
            let frame = 1;
            frame <= CONFIG.totalFrames;
            frame++
        ) {
            const preloadImage = new Image();

            preloadImage.src = getFrameUrl(frame);

            preloadedImages.push(preloadImage);
        }
    }

    function showFrame(frame) {
        if (frame > CONFIG.totalFrames) {
            frame = 1;
        }

        if (frame < 1) {
            frame = CONFIG.totalFrames;
        }

        currentFrame = frame;

        image.src = getFrameUrl(currentFrame);
    }

    function changeFrame(direction) {
        if (direction > 0) {
            showFrame(currentFrame + 1);
        } else if (direction < 0) {
            showFrame(currentFrame - 1);
        }
    }

    function handlePointerDown(event) {
        if (activePointerId !== null) {
            return;
        }

        activePointerId = event.pointerId;
        isDragging = true;

        lastX = event.clientX;
        accumulatedDistance = 0;

        container.classList.add("is-dragging");

        try {
            container.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn(
                "Spin 360: não foi possível capturar o ponteiro.",
                error
            );
        }

        event.preventDefault();
    }

    function handlePointerMove(event) {
        if (!isDragging) {
            return;
        }

        if (event.pointerId !== activePointerId) {
            return;
        }

        const currentX = event.clientX;
        const deltaX = currentX - lastX;

        lastX = currentX;
        accumulatedDistance += deltaX;

        while (
            Math.abs(accumulatedDistance) >=
            CONFIG.pixelsPerFrame
        ) {
            if (accumulatedDistance < 0) {
                changeFrame(1);
                accumulatedDistance +=
                    CONFIG.pixelsPerFrame;
            } else {
                changeFrame(-1);
                accumulatedDistance -=
                    CONFIG.pixelsPerFrame;
            }
        }

        event.preventDefault();
    }

    function endDrag(event) {
        if (!isDragging) {
            return;
        }

        if (
            event &&
            activePointerId !== null &&
            event.pointerId !== activePointerId
        ) {
            return;
        }

        isDragging = false;
        activePointerId = null;
        accumulatedDistance = 0;

        container.classList.remove("is-dragging");

        if (
            event &&
            typeof container.releasePointerCapture === "function"
        ) {
            try {
                container.releasePointerCapture(
                    event.pointerId
                );
            } catch (error) {
                console.warn(
                    "Spin 360: não foi possível liberar o ponteiro.",
                    error
                );
            }
        }
    }

    container.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    container.addEventListener(
        "pointermove",
        handlePointerMove
    );

    container.addEventListener(
        "pointerup",
        endDrag
    );

    container.addEventListener(
        "pointercancel",
        endDrag
    );

    container.addEventListener(
        "lostpointercapture",
        endDrag
    );

    image.addEventListener(
        "dragstart",
        (event) => {
            event.preventDefault();
        }
    );

    showFrame(1);

    preloadImages();
});
```
