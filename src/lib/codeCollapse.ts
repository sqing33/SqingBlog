export type CodeCollapseOptions = {
  maxHeight?: number;
  retryCount?: number;
  retryDelayMs?: number;
};

const DEFAULT_MAX_HEIGHT = 300;
const DEFAULT_RETRY_COUNT = 5;
const DEFAULT_RETRY_DELAY_MS = 100;

function createMask(expanded: boolean) {
  const mask = document.createElement("div");
  mask.className = expanded ? "code-mask is-expanded-mask" : "code-mask";
  mask.innerHTML = expanded
    ? '<div class="mask-content">⬆️ 收起代码</div>'
    : '<div class="mask-content"><span>⬇️ 代码太长，点击展开</span></div>';
  return mask;
}

function getBlockHeight(el: HTMLElement) {
  // `scrollHeight` is more reliable than `offsetHeight` if the element
  // is already constrained by other styles (e.g. max-height + overflow).
  return Math.max(el.scrollHeight || 0, el.offsetHeight || 0);
}

export function initCodeCollapse(
  container: Element | null,
  opts?: CodeCollapseOptions
) {
  const maxHeight = opts?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const retryDelayMs = opts?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const maxRetries = opts?.retryCount ?? DEFAULT_RETRY_COUNT;

  const run = (retry: number) => {
    if (!container) return;

    const codeBlocks = container.querySelectorAll("pre");
    if (codeBlocks.length === 0) {
      if (retry < maxRetries) {
        window.setTimeout(() => run(retry + 1), retryDelayMs);
      }
      return;
    }

    codeBlocks.forEach((pre) => {
      const parent = pre.parentElement;
      if (parent?.classList.contains("code-wrapper")) return;

      const preEl = pre as HTMLElement;
      const height = getBlockHeight(preEl);
      if (!height || height <= maxHeight) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-wrapper collapsed";
      wrapper.style.maxHeight = `${maxHeight}px`;

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const mask = createMask(false);

      mask.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isCollapsed = wrapper.classList.contains("collapsed");
        if (isCollapsed) {
          const actualHeight = getBlockHeight(preEl);
          wrapper.style.maxHeight = `${actualHeight}px`;
          wrapper.classList.remove("collapsed");
          wrapper.classList.add("expanded");
          mask.innerHTML = '<div class="mask-content">⬆️ 收起代码</div>';
          mask.classList.add("is-expanded-mask");

          // Force a reflow so the transition triggers reliably.
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          (wrapper as HTMLElement).offsetHeight;

          window.setTimeout(() => {
            if (wrapper.classList.contains("expanded")) {
              wrapper.style.maxHeight = "none";
            }
          }, 400);
        } else {
          wrapper.style.maxHeight = `${getBlockHeight(preEl)}px`;
          wrapper.classList.remove("expanded");
          mask.innerHTML = '<div class="mask-content"><span>⬇️ 代码太长，点击展开</span></div>';
          mask.classList.remove("is-expanded-mask");

          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          (wrapper as HTMLElement).offsetHeight;

          wrapper.classList.add("collapsed");
          wrapper.style.maxHeight = `${maxHeight}px`;
        }
      });

      wrapper.appendChild(mask);
    });
  };

  run(0);
}
