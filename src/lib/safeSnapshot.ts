import { onSnapshot as originalOnSnapshot, DocumentReference, Query, SnapshotListenOptions, DocumentSnapshot, QuerySnapshot, FirestoreError } from 'firebase/firestore';

function safeOnSnapshot(
  reference: Query<any, any> | DocumentReference<any, any>,
  optionsOrObserverOrOnNext: any,
  observerOrOnNextOrOnError?: any,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void {
  // To avoid unhandled quota errors, we will inject a safe error handler
  const customOnError = (err: FirestoreError) => {
    let skipOriginal = false;
    if (err.message && err.message.includes('Quota')) {
      console.warn('Quota Error gracefully caught in onSnapshot - allowing original handler to update UI state');
    }
    
    // Always call the original handler to ensure state consistency (like setLoading(false))
    if (typeof observerOrOnNextOrOnError === 'function' && onError) {
      onError(err);
    } else if (typeof optionsOrObserverOrOnNext?.error === 'function') {
       optionsOrObserverOrOnNext.error(err);
    } else if (typeof observerOrOnNextOrOnError === 'function') {
       observerOrOnNextOrOnError(err);
    } else {
       if (!err?.message?.includes('Quota')) {
         console.error('Snapshot Error:', err);
       }
    }
  };

  // Check how args were passed
  if (typeof optionsOrObserverOrOnNext === 'function') {
    // safeOnSnapshot(ref, onNext, onError?)
    return (originalOnSnapshot as any)(reference, optionsOrObserverOrOnNext, customOnError, onCompletion);
  } else if (optionsOrObserverOrOnNext && typeof optionsOrObserverOrOnNext === 'object') {
     if (typeof optionsOrObserverOrOnNext.next === 'function' || typeof optionsOrObserverOrOnNext.error === 'function') {
        // safeOnSnapshot(ref, {next, error, complete})
        return (originalOnSnapshot as any)(reference, {
           next: optionsOrObserverOrOnNext.next,
           error: customOnError,
           complete: optionsOrObserverOrOnNext.complete
        });
     } else {
        // safeOnSnapshot(ref, options, onNext, onError?)
        return (originalOnSnapshot as any)(reference, optionsOrObserverOrOnNext, observerOrOnNextOrOnError, customOnError, onCompletion);
     }
  }

  // fallback
  return (originalOnSnapshot as any)(reference, optionsOrObserverOrOnNext, observerOrOnNextOrOnError, onError, onCompletion);
}

export default safeOnSnapshot;
