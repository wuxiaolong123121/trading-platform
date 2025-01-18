import React, { useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import { ErrorSeverity } from '../services/errorHandler';

interface ErrorToastProps {
  id: string;
  message: string;
  severity: ErrorSeverity;
  onClose: (id: string) => void;
  autoClose?: boolean;
  duration?: number;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  id,
  message,
  severity,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  useEffect(() => {
    if (autoClose && severity !== 'critical') {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, autoClose, severity, duration, onClose]);

  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-400',
          text: 'text-red-800',
          icon: AlertOctagon
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-400',
          text: 'text-orange-800',
          icon: AlertCircle
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-400',
          text: 'text-yellow-800',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-400',
          text: 'text-blue-800',
          icon: AlertTriangle
        };
    }
  };

  const styles = getSeverityStyles();
  const Icon = styles.icon;

  return (
    <div 
      className={`fixed bottom-4 right-4 max-w-md ${styles.bg} border ${styles.border} rounded-lg shadow-lg animate-fade-in`}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${styles.text}`} aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${styles.text}`}>{message}</p>
            {severity === 'critical' && (
              <p className="mt-1 text-sm text-red-600">
                请刷新页面或联系客服获取帮助
              </p>
            )}
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => onClose(id)}
                className={`inline-flex rounded-md p-1.5 ${styles.text} hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${styles.bg} focus:ring-${styles.border}`}
              >
                <span className="sr-only">关闭</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorToast;