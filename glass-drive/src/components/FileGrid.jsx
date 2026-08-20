import FileCard from './FileCard.jsx';

/**
 * 网格视图：响应式卡片网格。
 */
export default function FileGrid({ files }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  );
}
