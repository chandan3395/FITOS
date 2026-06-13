import useInView from "./useInView";

/**
 * Reveal — fade + translate a block into view on scroll. The workhorse
 * transition for the marketing site. Compose with `delay` to stagger
 * siblings. Honors prefers-reduced-motion via useInView (renders final
 * state instantly).
 *
 * @param as       element/tag to render (default "div")
 * @param y/x      starting offset in px (default y:28)
 * @param delay    ms before the transition starts (for staggering)
 * @param once     animate once vs. every entry (default true)
 */
const Reveal = ({
  as: Tag = "div",
  children,
  className = "",
  y = 28,
  x = 0,
  delay = 0,
  duration = 700,
  once = true,
  style = {},
  ...props
}) => {
  const [ref, inView] = useInView({ once });

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translate3d(0,0,0)" : `translate3d(${x}px, ${y}px, 0)`,
        transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
