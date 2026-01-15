import './Preview.css';

interface PreviewProps {
  html: string;
}

function Preview({ html }: PreviewProps) {
  return (
    <div className="preview-container">
      <div 
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default Preview;
