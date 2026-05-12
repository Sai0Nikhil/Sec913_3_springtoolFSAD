import './PageHeader.css';

/**
 * A small page-level header used by admin pages.
 * Renders a title, optional subtitle, optional crumbs, and an optional actions slot on the right.
 */
const PageHeader = ({ title, subtitle, crumbs, actions }) => {
    return (
        <div className="page-header">
            <div className="page-header-text">
                {crumbs && crumbs.length > 0 && (
                    <div className="page-crumbs">
                        {crumbs.map((c, i) => (
                            <span key={i} className="page-crumb">
                                {c}
                                {i < crumbs.length - 1 && <span className="page-crumb-sep">›</span>}
                            </span>
                        ))}
                    </div>
                )}
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
