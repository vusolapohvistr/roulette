window.notLegacyRoulette = (() => {
    function playGame({
                          rouletteId,
                          winnerPosition,
                          mainLoopsCount,
                          slowDownLoopsCount,
                          lastStageDuration,
                          loopDuration,
                          lastStageCubicBazier,
                          onStart,
                          onFinish,
                          slowDownCount
                      }) {
        lastStageCubicBazier = lastStageCubicBazier || "cubic-bezier(.95,.93,.74,1.44)";
        slowDownCount = slowDownCount || 100;
        const roulette = document.getElementById(rouletteId);
        roulette.style.setProperty('transform', 'translate3d(0, 0, 0)');
        roulette.style.setProperty('overflow', 'visible');
        const childrenCopy = roulette.cloneNode(true).children;
        const winner = childrenCopy.item(winnerPosition).cloneNode(true);

        const elementWidth = roulette.children[0].offsetWidth;
        const replacementNodePos = ~~calculateFinalWinnerPosition(winnerPosition, elementWidth) + 1;
        let c = 0;

        const observerCallback = () => {
            requestAnimationFrame(() => {
                console.log('starting animation', c++);
                const a = roulette.animate([
                    {transform: 'translateX(0%)'},
                    {transform: `translateX(-${100 / (minCopies)}%)`},
                ], {
                    duration: 1000 * loopDuration,
                    iterations: mainLoopsCount
                });
                onStart && onStart();
                let finishedStart = false;
                a.onfinish = () => {
                    !finishedStart && requestAnimationFrame(async () => {
                        finishedStart = true;
                        console.log('starting slowdown animation', c++);
                        const sleep = time => new Promise(r => setTimeout(() => r(), time));
                        let anime = roulette.animate([
                            {transform: 'translateX(0%)'},
                            {transform: `translateX(-${100 / (minCopies)}%)`},
                        ], {
                            duration: 1000 * loopDuration,
                            iterations: slowDownLoopsCount,
                        });
                        let finishedSlowDown = false; //low CPU performance kostil... UB fix

                        anime.onfinish = () => {
                            console.log('finished slowdown animation');
                            !finishedSlowDown && requestAnimationFrame(async () => {
                                finishedSlowDown = true;
                                console.log('starting last animation', c++);
                                const leftOffset = calculateCentreForItemInBlock(roulette, replacementNodePos + childrenCopy.length - 1);
                                console.log(Math.round(leftOffset * 100), 100 / minCopies);
                                const lastAnimation = roulette.animate([
                                    {transform: 'translateX(0%)'},
                                    {transform: `translateX(-${100 / minCopies}%)`},
                                ], {
                                    duration: 1000 * lastStageDuration,
                                    easing: lastStageCubicBazier,
                                });
                                const slowDownCoef = 0.98;
                                const timeDelta = 60;
                                for (let i = 0; i <= slowDownCount / 2; i++) {
                                    await sleep(timeDelta);
                                    lastAnimation.playbackRate *= slowDownCoef;
                                }
                                lastAnimation.onfinish = onFinish;
                                observer.disconnect();
                            });
                        };

                        const slowDownCoef = Math.pow((loopDuration / lastStageDuration), 1 / slowDownCount);
                        const timeDelta = calculateTimeDelta(slowDownLoopsCount, slowDownCoef, loopDuration * 1000, slowDownCount);
                        for (let i = 0; i < slowDownCount && !finishedSlowDown; i++) {
                            await sleep(timeDelta);
                            anime.playbackRate *= slowDownCoef;
                        }
                    });
                }
            });
        };

        const config = { attributes: false, childList: true, subtree: false };

        let observer = new MutationObserver(observerCallback);
        observer.observe(roulette, config);

        const minCopies = Math.round(window.innerWidth / roulette.offsetWidth) + 2;
        const fullWidthRandomCopies = [];
        const randomSortedChildren = getRandomSortedElements(childrenCopy);
        for (let i = 0; i < minCopies; i++) {
            for (let el of randomSortedChildren) {
                fullWidthRandomCopies.push(el);
            }
        }
        while (roulette.firstChild) {
            roulette.removeChild(roulette.firstChild);
        }

        const fragment = document.createDocumentFragment();

        for (let el of fullWidthRandomCopies) {
            fragment.append(el.cloneNode(true));
        }

        fragment.childNodes[replacementNodePos].replaceWith(winner);
        for (let i = replacementNodePos + childrenCopy.length; i < fragment.childNodes.length; i += childrenCopy.length) {
            fragment.childNodes[i].replaceWith(winner.cloneNode(true));
        }

        roulette.appendChild(fragment);

        c++;
    }

    function calculateFinalWinnerPosition(winnerPosition, elementWidth) {
        return (~~(window.innerWidth / elementWidth)) / 2 - 1
    }

    function calculateTimeDelta(loopsCount, slowDownCoef, startDur, slowDownCount) {
        let a = 0;
        for (let i = 0; i < slowDownCount; i++) {
            a += 1 / Math.pow(slowDownCoef, i);
        }
        return loopsCount * startDur / a;
    }

    function calculateCentreForItemInBlock(parent, itemIndex) {
        const fullWidth = parent.offsetWidth;
        const itemWidth = parent.offsetWidth / parent.children.length;
        return (itemWidth * itemIndex + itemWidth / 2) / fullWidth;
    }

    function getRandomSortedElements(elements) {
        const result = [];
        const elementsCopy = [...elements];
        while (elementsCopy.length > 0) {
            result.push(elementsCopy.splice(~~(Math.random() * (elementsCopy.length - 1)), 1)[0]);
        }
        return result;
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
