import { tick } from 'svelte';

export function autosizeTextarea(node: HTMLTextAreaElement, _value: string | undefined) {
    let active = true;
    let frame = 0;
    let width = node.getBoundingClientRect().width;

    function resize() {
        if (!active) return;
        const style = getComputedStyle(node);
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight + border}px`;
    }

    function schedule() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(resize);
    }

    const observer = new ResizeObserver(() => {
        const nextWidth = node.getBoundingClientRect().width;
        if (nextWidth !== width) {
            width = nextWidth;
            schedule();
        }
    });
    observer.observe(node);
    node.addEventListener('input', resize);
    schedule();
    document.fonts.ready.then(() => { if (active) schedule(); });

    return {
        async update(_value: string | undefined) {
            await tick();
            if (active) schedule();
        },
        destroy() {
            active = false;
            cancelAnimationFrame(frame);
            observer.disconnect();
            node.removeEventListener('input', resize);
        }
    };
}
