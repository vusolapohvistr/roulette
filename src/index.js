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

        for (let el of fullWidthRandomCopies) {
            roulette.append(el.cloneNode(true));
        }

        const elementWidth = roulette.children[0].offsetWidth;
        const replacementNodePos = ~~calculateFinalWinnerPosition(winnerPosition, elementWidth) + 1;

        roulette.childNodes[replacementNodePos].replaceWith(winner);
        for (let i = replacementNodePos; i < roulette.childNodes.length; i += childrenCopy.length) {
            roulette.childNodes[i].replaceWith(winner.cloneNode(true));
        }

        const a = roulette.animate([
            {transform: 'translateX(0%)'},
            {transform: `translateX(-${100 / (minCopies)}%)`},
        ], {
            duration: 1000 * loopDuration,
            iterations: mainLoopsCount
        });
        onStart && onStart();
        a.onfinish = () => {
            requestAnimationFrame(async () => {
                const sleep = time => new Promise(r => setTimeout(() => r(), time));
                const slowDownStartTime = Date.now();
                let anime = roulette.animate([
                    {transform: 'translateX(0%)'},
                    {transform: `translateX(-${100 / (minCopies)}%)`},
                ], {
                    duration: 1000 * loopDuration,
                    iterations: slowDownLoopsCount,
                });
                const slowDownCoef = Math.pow((loopDuration / lastStageDuration), 1 / slowDownCount);
                const timeDelta = calculateTimeDelta(slowDownLoopsCount, slowDownCoef, loopDuration * 1000, slowDownCount);
                for (let i = 0; i < slowDownCount; i++) {
                    await sleep(timeDelta);
                    anime.playbackRate *= slowDownCoef;
                }
                anime.onfinish = () => {
                    console.log(Date.now() - slowDownStartTime);
                    requestAnimationFrame(async () => {
                        const lastAnimation = roulette.animate([
                            {transform: 'translateX(0%)'},
                            {transform: `translateX(-${100 / (minCopies)}%)`},
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
                };
            });
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
