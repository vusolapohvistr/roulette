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
        const BROWSER = navigator.userAgent.split(' ').slice(-1).pop().split('/')[0].toUpperCase();
        const roulette = document.getElementById(rouletteId);
        roulette.style.setProperty('transform', 'translate3d(0, 0, 0)');
        roulette.parentElement.style.setProperty('overflow', 'visible');
        const childrenCopy = roulette.cloneNode(true).children;
        const winner = childrenCopy.item(winnerPosition).cloneNode(true);

        const elementWidth = roulette.children[0].offsetWidth;
        const replacementNodePos = ~~calculateFinalWinnerPosition(winnerPosition, elementWidth) + 1;
        let c = 0;
        const minCopies = Math.round(window.innerWidth / roulette.offsetWidth) + 2;
        const winnerNodeIndex = roulette.childNodes.length - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2) - 2;

        const observerCallback = () => {
            switch (BROWSER) {
                case 'FIREFOX':
                    fireFoxGame({...arguments[0],
                        roulette, childrenCopy, observer,
                        minCopies, slowDownCount, lastStageCubicBazier, winnerNodeIndex});
                    break;
                default:
                    defaultGame({...arguments[0],
                        roulette, childrenCopy, observer, minCopies, slowDownCount, lastStageCubicBazier});
                    break;
            }
            observer.disconnect();
        };

        const config = { attributes: false, childList: true, subtree: false };

        let observer = new MutationObserver(observerCallback);
        observer.observe(roulette, config);

        switch (BROWSER) {
            case 'FIREFOX':
                roulette.childNodes[winnerNodeIndex].replaceWith(winner);
                break;
            default:
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
                break;
        }
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
                                minCopies,
                             replacementNodePos,
                             childrenCopy,
                         }) {
        let c = 0;
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
                    console.log('starting slowdown animation', c++);
                    const sleep = time => new Promise(r => setTimeout(() => r(), time));
                    let anime = roulette.animate([
                        {transform: 'translateX(0%)'},
                        {transform: `translateX(-${100 / (minCopies)}%)`},
                    ], {
                        duration: 1000 * loopDuration,
                        iterations: slowDownLoopsCount,
                    });
                    let finishedSlowDown = false; //low CPU performance kostiol... UB fix

                    anime.onfinish = () => {
                        console.log('finished slowdown animation');
                        !finishedSlowDown && requestAnimationFrame(async () => {
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
                             mainLoopsCount,
                             slowDownLoopsCount,
                             lastStageDuration,
                             loopDuration,
                             lastStageCubicBazier,
                             onStart,
                             onFinish,
                             slowDownCount,
                             minCopies,
                             replacementNodePos,
                             winnerNodeIndex,
                             childrenCopy,
                         }) {
        requestAnimationFrame(async () => {
            onStart && onStart();
            /*
            roulette.transitionEnd = function () {
                return new Promise(r => {
                    const trEnd = () => {
                        roulette.removeEventListener('transitionend', trEnd);
                        console.log('transition end');
                        r();
                    };
                    roulette.addEventListener('transitionend', trEnd);
                });
            }
            const sleep = time => new Promise(r => setTimeout(() => r(), time));
            for (let i = 0; i < mainLoopsCount + slowDownLoopsCount; i++) {
                roulette.style.removeProperty('transform');
                roulette.style.removeProperty('transition');
                await sleep(5);
                roulette.style.setProperty('transition', `transform ${loopDuration}s linear`);
                roulette.style.setProperty('transform', `translate3d(-${100 / minCopies}%, 0, 0)`);
                await roulette.transitionEnd();
                console.log(i);
            }
            roulette.style.removeProperty('transform');
            roulette.style.removeProperty('transition');
            await sleep(5);
            roulette.style.setProperty('transition', `transform ${lastStageDuration * 1.5}s cubic-bezier(0.32, 0.64, 0.45, 1)`);
            roulette.style.setProperty('transform', `translate3d(-${100 / minCopies}%, 0, 0)`);
            roulette.addEventListener('transitionend', onFinish);

             */
            console.log(roulette.firstChild.offse)
            const offset = ~~((winnerNodeIndex - ~~((window.innerWidth / roulette.firstChild.offsetWidth) / 2)) * roulette.firstChild.offsetWidth);
            const offset2 = calculateCentreForItemInBlock(roulette, roulette.childNodes.length - replacementNodePos);
            console.log(offset, offset2, replacementNodePos, roulette.childNodes.length, roulette.firstChild.offsetWidth);
            roulette.style.setProperty('transition', `transform 10s cubic-bezier(0.32, 0.64, 0.45, 1)`);
            roulette.style.setProperty('transform', `translate3d(-${offset}px, 0, 0)`);
            setTimeout(onFinish, 10500);
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
