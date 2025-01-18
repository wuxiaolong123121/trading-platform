import React from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon, Trash2 } from 'lucide-react';
import { ErrorLog, useErrorStore } from '../services/errorHandler';

const ErrorList: React.FC = () => {
  const { errors, clearErrors, removeError } = useErrorStore();

  const getSeverityIcon = (severity: ErrorLog['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-500" />;
    }
  };

  if (errors.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        暂无错误日志
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">错误日志</h3>
        <button
          onClick={clearErrors}
          className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
          <span>清空日志</span>
        </button>
      </div>

      <div className="space-y-3">
        {errors.map((error) => (
          <div
            key={error.id}
            className={`p-4 rounded-lg flex items-start space-x-3 ${
              error.severity === 'critical' ? 'bg-red-50' :
              error.severity === 'high' ? 'bg-orange-50' :
              error.severity === 'medium' ? 'bg-yellow-50' :
              'bg-blue-50'
            }`}
          >
            {getSeverityIcon(error.severity)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {error.severity.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-1">{error.message}</p>
              {error.context && (
                <pre className="mt-2 text-sm bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              )}
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer">
                    显示错误堆栈
                  </summary>
                  <pre className="mt-1 text-sm bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => removeError(error.id)}
              className="text-gray-400 hover:text-gray-600"
              title="删除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ErrorList;