interface cubicBezierRightPoint {
    x: number,
    y: number
}

interface playGameConfig {
    rouletteId: string,
    winnerPosition: number,
    loopDuration: number,
    lastStageDuration: number,
    loopsCount: number,
    slowDownCoefficient: number,
    cubicBezierRightPoint?: cubicBezierRightPoint,
    onStart?: Function,
    onFinish?: Function,
}

interface mainGameConfig {
    roulette: HTMLElement,
    winnerNodeIndex: number,
    loopDuration: number,
    lastStageDuration: number,
    loopsCount: number,
    slowDownCoefficient: number,
    cubicBezierRightPoint: cubicBezierRightPoint,
    onStart?: Function,
    onFinish?: Function,
}

// @ts-ignore
window.notLegacyRoulette = (() => {
    function playGame({
                          rouletteId,
                          winnerPosition,
                          loopDuration,
                          lastStageDuration,
                          loopsCount,
                          slowDownCoefficient,
                          cubicBezierRightPoint = {
                              x: 0.74,
                              y: 1,
                          },
                          onStart,
                          onFinish,
                      }: playGameConfig) {
        if (cubicBezierRightPoint.x > 1 || cubicBezierRightPoint.x < 0) {
            throw new TypeError('cubic-bezier X must be in [0, 1] interval');
        }

        const isFirefox = navigator.userAgent.toUpperCase().includes('FIREFOX');
        const roulette = document.getElementById(rouletteId);
        if (roulette != null) {
            if (roulette.children && roulette.firstElementChild) {
                const winner = roulette.children.item(winnerPosition)?.cloneNode(true);
                const elementWidth = (roulette.children[0] as HTMLDivElement).offsetWidth;
                if (winner != null) {
                    const replacementNodePos = ~~((window.innerWidth / elementWidth) / 2);
                    roulette.children[replacementNodePos].replaceWith(winner.cloneNode(true));

                    const minCopies = Math.round(window.innerWidth / roulette.offsetWidth);
                    let winnerNodeIndex: number;

                    const observerCallback = () => {
                        mainGame({
                            roulette,
                            slowDownCoefficient,
                            onStart,
                            onFinish,
                            loopDuration,
                            lastStageDuration,
                            loopsCount,
                            winnerNodeIndex,
                            cubicBezierRightPoint,
                        });
                        observer.disconnect();
                    };

                    const config = {attributes: false, childList: true, subtree: false};

                    let observer = new MutationObserver(observerCallback);
                    observer.observe(roulette, config);

                    if (isFirefox) {
                        console.log('FIREFOX');
                        roulette.style.setProperty('overflow', 'visible');
                    } else {
                        roulette.style.setProperty('overflow', 'hidden');
                    }

                    const additionalNodes = new DocumentFragment();
                    // add additional children to make roulette full width
                    for (let i = 0; i < minCopies; i++) {
                        for (const node of roulette.children) {
                            additionalNodes.appendChild(node.cloneNode(true));
                        }
                    }
                    const fullWidthElementCount =
                        ~~(window.innerWidth / (roulette.firstElementChild as HTMLDivElement).offsetWidth) + 1;
                    for (let i = 0; i < fullWidthElementCount; i++) {
                        additionalNodes.appendChild(roulette.children[i].cloneNode(true));
                    }
                    roulette.appendChild(additionalNodes);
                    winnerNodeIndex = roulette.children.length - ~~(fullWidthElementCount / 2) - 1;
                    roulette.children[winnerNodeIndex].replaceWith(winner.cloneNode(true));
                } else {
                    throw new Error('Invalid winner position');
                }
            } else {
                throw new Error('Roulette does not have children');
            }
        } else {
            throw new Error('Invalid roulette ID');
        }
    }

    function mainGame({
                          roulette,
                          slowDownCoefficient,
                          loopDuration,
                          lastStageDuration,
                          loopsCount,
                          winnerNodeIndex,
                          onStart,
                          onFinish,
                          cubicBezierRightPoint
                      }: mainGameConfig) {
        if (roulette.firstElementChild) {
            const firstChild = roulette.firstElementChild as HTMLDivElement;
            const itemWidth = firstChild.offsetWidth;
            const offset = ~~((winnerNodeIndex - ~~((window.innerWidth / itemWidth) / 2))
                    * itemWidth);
            const keyframes = [
                {transform: 'translate3d(0, 0, 0)'},
                {transform: `translate3d(-${offset}px, 0, 0)`},
            ];
            onStart && onStart();
            requestAnimationFrame(() => {
                const mainAnimation = roulette.animate(keyframes, {
                    duration: 1000 * loopDuration,
                    iterations: loopsCount,
                });
                let finishedStart = false;
                // calculate starting point;
                const x2 = loopDuration / lastStageDuration;
                const y2 = 1;
                const cubic = `cubic-bezier(${x2 * slowDownCoefficient},
                 ${y2 * slowDownCoefficient},
                 ${cubicBezierRightPoint.x},
                 ${cubicBezierRightPoint.y})`;
                console.log(cubic);
                roulette.style.setProperty('transition', `all ${lastStageDuration}s ${cubic} 0s`);
                roulette.style.setProperty('transform', `translate3d(0px, 0px, 0px)`);

                const winnerPosition = (roulette.children[winnerNodeIndex] as HTMLDivElement).getBoundingClientRect();
                const lastOffset = winnerPosition.left - window.innerWidth / 2 + itemWidth / 2;
                mainAnimation.onfinish = () => {
                    !finishedStart && setTimeout(() => {
                        roulette.style.setProperty('transform', `translate3d(-${lastOffset}px, 0px, 0px)`);
                        onFinish && setTimeout(onFinish, lastStageDuration * 1000 + 1);
                    }, 0);
                    finishedStart = true;
                }
            });
        }
    }

    return {
        playGame,
    }
})();

/*
notLegacyRoulette.playGame({
    rouletteId: 'list',
    winnerPosition: 3,
    mainLoopsCount: 4,
    slowDownLoopsCount: 2,
    lastStageDuration: 3,
    loopDuration: 1,
    slowDownCounts: 100,
    onFinish: () => alert('the end'),
});
*/
