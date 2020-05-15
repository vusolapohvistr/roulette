import {detect} from "detect-browser";

window.notLegacyRoulette = (() => {
    function playGame({
                          rouletteId,
                          winnerPosition,
                          mainLoopsCount,
                          slowDownLoopsCount,
                          lastStageDuration,
                          loopDuration,
                          criosLoopDuration,
                          criolLastStageDuration,
                          criosLoopsCount,
                          lastStageCubicBazier,
                          onStart,
                          onFinish,
                          slowDownCount
                      }) {
        lastStageCubicBazier = lastStageCubicBazier || "cubic-bezier(.95,.93,.74,1.44)";
        slowDownCount = slowDownCount || 100;
        const browser = detect();
        const roulette = document.getElementById(rouletteId);
        const winner = roulette.childNodes.item(winnerPosition).cloneNode(true);
        const elementWidth = roulette.children[0].offsetWidth;

        const replacementNodePos = ~~((window.innerWidth / elementWidth) / 2);
        roulette.childNodes[replacementNodePos].replaceWith(winner.cloneNode(true));

        const minCopies = Math.round(window.innerWidth / roulette.offsetWidth);
        let winnerNodeIndex;

        const observerCallback = () => {
            switch (browser.name) {
                case 'firefox':
                    if (parseInt(browser.version) < 70) {
                        fireFoxGame({
                            ...arguments[0],
                            roulette, observer,
                            minCopies, slowDownCount, lastStageCubicBazier, winnerNodeIndex, replacementNodePos,
                        });
                    } else {
                        defaultGame({
                            ...arguments[0],
                            roulette,
                            observer,
                            winnerNodeIndex,
                            replacementNodePos,
                            slowDownCount,
                            lastStageCubicBazier,
                        });
                    }
                    break;
                case 'crios':
                    iOSGame({
                        ...arguments[0],
                        roulette, observer, winnerNodeIndex, replacementNodePos, slowDownCount, lastStageCubicBazier,
                    });
                    break;
                default:
                    defaultGame({
                        ...arguments[0],
                        roulette, observer, winnerNodeIndex, replacementNodePos, slowDownCount, lastStageCubicBazier
                    });
                    break;
            }
            observer.disconnect();
        };

        const config = {attributes: false, childList: true, subtree: false};

        let observer = new MutationObserver(observerCallback);
        observer.observe(roulette, config);

        roulette.style.setProperty('overflow', 'hidden');
        switch (browser.name) {
            case 'firefox':
                roulette.style.setProperty('overflow', 'visible');
                if (parseInt(browser.version) < 70) {
                    winnerNodeIndex = roulette.childNodes.length - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2) - 2;
                    roulette.childNodes[winnerNodeIndex].replaceWith(winner);
                    break;
                }
            default:
                const additionalNodes = new DocumentFragment();
                // add additional children to make roulette full width
                for (let i = 0; i < minCopies; i++) {
                    for (const node of roulette.childNodes) {
                        additionalNodes.appendChild(node.cloneNode(true));
                    }
                }
                const fullWidthElementCount = ~~(window.innerWidth / roulette.firstChild.offsetWidth) + 1;
                for (let i = 0; i < fullWidthElementCount; i++) {
                    additionalNodes.appendChild(roulette.childNodes[i].cloneNode(true));
                }
                roulette.appendChild(additionalNodes);
                winnerNodeIndex = roulette.childNodes.length - ~~(fullWidthElementCount / 2) - 1;
                roulette.childNodes[winnerNodeIndex].replaceWith(winner.cloneNode(true));
                break;
        }
    }

    function calculateTimeDelta(loopsCount, slowDownCoef, startDur, slowDownCount) {
        let a = 0;
        for (let i = 0; i < slowDownCount; i++) {
            a += 1 / Math.pow(slowDownCoef, i);
        }
        return loopsCount * startDur / a;
    }

    function defaultGame({
                             roulette,
                             mainLoopsCount,
                             slowDownLoopsCount,
                             lastStageDuration,
                             loopDuration,
                             lastStageCubicBazier,
                             onStart,
                             onFinish,
                             slowDownCount,
                             winnerNodeIndex,
                         }) {
        const offset = ~~((winnerNodeIndex - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2)) * roulette.firstChild.offsetWidth);
        const keyframes = [
            {transform: 'translate3d(0, 0, 0)'},
            {transform: `translate3d(-${offset}px, 0, 0)`},
        ];
        onStart && onStart();
        requestAnimationFrame(() => {
            const a = roulette.animate(keyframes, {
                duration: 1000 * loopDuration,
                iterations: mainLoopsCount
            });
            let finishedStart = false;
            a.onfinish = () => {
                !finishedStart && requestAnimationFrame(async () => {
                    const sleep = time => new Promise(r => setTimeout(() => r(), time));
                    let anime = roulette.animate(keyframes, {
                        duration: 1000 * loopDuration,
                        iterations: slowDownLoopsCount,
                    });
                    let finishedSlowDown = false; //low CPU performance kostiol... UB fix

                    anime.onfinish = () => {
                        const slowDownCoef = 0.98;
                        const timeDelta = 60;

                        !finishedSlowDown && requestAnimationFrame(async () => {
                            let lastAnimationFinished = false;
                            const lastAnimation = roulette.animate(keyframes, {
                                duration: 1000 * lastStageDuration,
                                easing: lastStageCubicBazier,
                            });
                            for (let i = 0; i <= slowDownCount / 2; i++) {
                                await sleep(timeDelta);
                                lastAnimation.playbackRate *= slowDownCoef;
                            }
                            lastAnimation.onfinish = () => {
                                !lastAnimationFinished && onFinish && setTimeout(onFinish, 100);
                                lastAnimationFinished = true;
                            };
                        });
                        finishedSlowDown = true;
                    };
                    const slowDownCoef = Math.pow((loopDuration / lastStageDuration), 1 / slowDownCount);
                    const timeDelta = calculateTimeDelta(slowDownLoopsCount, slowDownCoef, loopDuration * 1000, slowDownCount);
                    for (let i = 0; i < slowDownCount && !finishedSlowDown; i++) {
                        await sleep(timeDelta);
                        anime.playbackRate *= slowDownCoef;
                    }
                });
                finishedStart = true;
            }
        });
    }

    function fireFoxGame({
                             roulette,
                             onStart,
                             onFinish,
                             winnerNodeIndex,
                         }) {
        requestAnimationFrame(async () => {
            onStart && onStart();

            const offset = ~~((winnerNodeIndex - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2)) * roulette.firstChild.offsetWidth);
            roulette.style.setProperty('transition', `transform 10s cubic-bezier(0.32, 0.64, 0.45, 1)`);
            roulette.style.setProperty('transform', `translate3d(-${offset}px, 0, 0)`);
            setTimeout(onFinish, 10500);
        });
    }

    function iOSGame({
                         roulette,
                         lastStageCubicBazier,
                         onStart,
                         onFinish,
                         criosLoopDuration,
                         criolLastStageDuration,
                         criosLoopsCount,
                         winnerNodeIndex,
                     }) {
        const offset = ~~((winnerNodeIndex - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2)) * roulette.firstChild.offsetWidth);
        const keyframes = [
            {transform: 'translate3d(0, 0, 0)'},
            {transform: `translate3d(-${offset}px, 0, 0)`},
        ];
        onStart && onStart();
        requestAnimationFrame(() => {
            const mainAnimation = roulette.animate(keyframes, {
                duration: 1000 * criosLoopDuration,
                iterations: criosLoopsCount
            });
            let finishedStart = false;
            mainAnimation.onfinish = () => {
                !finishedStart && requestAnimationFrame(async () => {
                    let lastAnimationFinished = false;
                    const lastAnimation = roulette.animate(keyframes, {
                        duration: 1000 * criolLastStageDuration,
                        easing: lastStageCubicBazier,
                        iterations: 1,
                    });

                    lastAnimation.onfinish = () => {
                        !lastAnimationFinished && onFinish && setTimeout(onFinish, 100);
                        lastAnimationFinished = true;
                    };
                });
                finishedStart = true;
            }
        });
    }

    return {
        playGame
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
