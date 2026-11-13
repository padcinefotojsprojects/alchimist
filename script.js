document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const container = document.getElementById("spin-container");
    const image = document.getElementById("myImg");

    if (!container || !image || typeof CONFIG === "undefined") {
        console.error("Spin 360: elementos ou configuração não encontrados.");
        return;
    }

    // ==========================================
    // MOTOR FÍSICO — INÉRCIA E DESACELERAÇÃO
    // ==========================================

    const PHYSICS = {
        maxVelocity: 36,       // Frames por segundo
        friction: 1.4,         // Resistência ao movimento
        stopThreshold: 0.04,   // Velocidade mínima
        velocitySmoothing: 0.35,
        maxDeltaTime: 0.05
    };

    let currentFrame = 1;
    let frameAccumulator = 0;

    let isDragging = false;
    let activePointerId = null;

    let lastX = 0;
    let lastMoveTime = 0;
    let velocitySamples = [];

    let velocity = 0;
    let animationId = null;
    let lastAnimationTime = 0;

    const preloadedImages = [];

    // ==========================================
    // CARREGAMENTO DOS FRAMES
    // ==========================================

    function getFrameUrl(frame) {
        const paddedFrame = String(frame).padStart(
            CONFIG.framePadding,
            "0"
        );

        return CONFIG.imagePath +
            paddedFrame +
            CONFIG.imageExtension;
    }

    function preloadImages() {
        for (let frame = 1; frame <= CONFIG.totalFrames; frame++) {
            const preloadImage = new Image();
            preloadImage.src = getFrameUrl(frame);
            preloadedImages.push(preloadImage);
        }
    }

    // ==========================================
    // CONTROLE DOS FRAMES
    // ==========================================

    function showFrame(frame) {
        const total = CONFIG.totalFrames;

        currentFrame = ((frame - 1 + total) % total) + 1;

        image.src = getFrameUrl(currentFrame);
    }

    function applyFrameMovement(movement) {
        frameAccumulator += movement;

        const wholeFrames = Math.trunc(frameAccumulator);

        if (wholeFrames === 0) return;

        frameAccumulator -= wholeFrames;

        showFrame(currentFrame + wholeFrames);
    }

    // ==========================================
    // CONTROLE DA ANIMAÇÃO
    // ==========================================

    function stopInertia() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        velocity = 0;
        lastAnimationTime = 0;
    }

    function animateInertia(timestamp) {
        if (isDragging) {
            stopInertia();
            return;
        }

        if (!lastAnimationTime) {
            lastAnimationTime = timestamp;
        }

        let deltaTime = (timestamp - lastAnimationTime) / 1000;

        lastAnimationTime = timestamp;

        deltaTime = Math.min(
            deltaTime,
            PHYSICS.maxDeltaTime
        );

        // Movimento angular durante o intervalo
        applyFrameMovement(velocity * deltaTime);

        // Atrito exponencial: desaceleração progressiva
        velocity *= Math.exp(
            -PHYSICS.friction * deltaTime
        );

        // Parada natural
        if (Math.abs(velocity) < PHYSICS.stopThreshold) {
            velocity = 0;
            animationId = null;
            lastAnimationTime = 0;
            return;
        }

        animationId = requestAnimationFrame(animateInertia);
    }

    function startInertia() {
        if (Math.abs(velocity) < PHYSICS.stopThreshold) {
            velocity = 0;
            return;
        }

        lastAnimationTime = 0;

        animationId = requestAnimationFrame(animateInertia);
    }

    // ==========================================
    // INTERAÇÃO COM O PONTEIRO
    // ==========================================

    function handlePointerDown(event) {
        if (activePointerId !== null) return;

        stopInertia();

        activePointerId = event.pointerId;
        isDragging = true;

        lastX = event.clientX;
        lastMoveTime = performance.now();
        velocitySamples = [{ x: lastX, t: lastMoveTime }];

        frameAccumulator = 0;
        velocity = 0;

        container.classList.add("is-dragging");

        try {
            container.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn("Spin 360: captura de ponteiro indisponível.", error);
        }

        event.preventDefault();
    }

    function handlePointerMove(event) {
        if (!isDragging || event.pointerId !== activePointerId) {
            return;
        }

        const now = performance.now();
        const deltaX = event.clientX - lastX;
        const deltaTime = (now - lastMoveTime) / 1000;

        lastX = event.clientX;
        lastMoveTime = now;

        // Conversão do deslocamento em frames
        const frameMovement = -deltaX / CONFIG.pixelsPerFrame;

        applyFrameMovement(frameMovement);

        // Velocidade calculada pela janela recente de movimento
        velocitySamples.push({ x: event.clientX, t: now });

        // Mantém aproximadamente os últimos 120 ms
        while (
            velocitySamples.length > 2 &&
            now - velocitySamples[0].t > 120
        ) {
            velocitySamples.shift();
        }

        if (velocitySamples.length >= 2) {
            const first = velocitySamples[0];
            const last = velocitySamples[velocitySamples.length - 1];

            const elapsed = (last.t - first.t) / 1000;

            if (elapsed > 0.015) {
                const measuredVelocity =
                    -((last.x - first.x) / CONFIG.pixelsPerFrame) / elapsed;

                velocity = Math.max(
                    -PHYSICS.maxVelocity,
                    Math.min(PHYSICS.maxVelocity, measuredVelocity)
                );
            }
        }

        event.preventDefault();
    }

    function endDrag(event) {
        if (!isDragging) return;

        if (
            event &&
            event.pointerId !== undefined &&
            event.pointerId !== activePointerId
        ) {
            return;
        }

        const pointerId = activePointerId;

        isDragging = false;
        activePointerId = null;

        container.classList.remove("is-dragging");

        if (
            event &&
            typeof container.releasePointerCapture === "function" &&
            pointerId !== null
        ) {
            try {
                if (container.hasPointerCapture(pointerId)) {
                    container.releasePointerCapture(pointerId);
                }
            } catch (error) {
                console.warn("Spin 360: liberação de ponteiro indisponível.", error);
            }
        }

        // Preserva a velocidade adquirida no arraste
        startInertia();
    }

    // ==========================================
    // EVENTOS
    // ==========================================

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    container.addEventListener("lostpointercapture", endDrag);

    image.addEventListener("dragstart", event => {
        event.preventDefault();
    });

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    showFrame(1);
    preloadImages();

});
