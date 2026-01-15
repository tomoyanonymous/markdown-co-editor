import './Preview.css';

interface PreviewProps {
  html: string;
  isRendering: boolean;
}

function Preview({ html, isRendering }: PreviewProps) {
  return (
    <div className="preview-container">
      {isRendering && (
        <div className="rendering-indicator">
          <div className="spinner"></div>
          <span>Rendering with Pandoc...</span>
        </div>
      )}
      <div 
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default Preview;
