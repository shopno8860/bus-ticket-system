function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="alert alert-error max-w-lg">
      <div>
        <h3 className="font-bold">{title}</h3>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export default ErrorState;
