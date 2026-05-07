import './FloatingBadge.css';

/**
 * A small frosted pill that floats around the viewport perimeter,
 * showing the section identifier. Pointer-events are disabled so it
 * never blocks clicks underneath.
 */
const FloatingBadge = ({ text = "@2500032630 Sec_913" }) => {
    return (
        <div className="floating-badge" aria-hidden="true">
            <span className="floating-badge-dot" />
            <span className="floating-badge-text">{text}</span>
        </div>
    );
};

export default FloatingBadge;
