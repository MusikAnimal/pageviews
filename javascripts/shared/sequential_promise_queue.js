/**
 * A queue that runs jQuery/JavaScript promises sequentially to prevent concurrent API calls.
 */
class SequentialPromiseQueue {
  /**
   * Initializes the queue with a resolved promise to start the chain.
   */
  constructor() {
    // Initialize the queue with an already resolved promise.
    // This acts as the starting point of the chain.
    this.queue = Promise.resolve();
  }

  /**
   * Adds a promise-returning function to the queue.
   * @param {function(): Promise<any> | function(): jqXHR} task - A function that returns a promise (e.g., a function wrapping $.ajax()).
   * @returns {Promise<any>} A new promise that resolves with the result of the task once it's executed in sequence.
   */
  enqueue(task) {
    // Create a new promise that wraps the next step in the sequence
    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(() => task()) // When the previous promise resolves, run the new task
        .then(result => {
          resolve(result); // Resolve the wrapper promise with the task's result
        })
        .catch(error => {
          reject(error); // Reject the wrapper promise if the task fails
          // Optionally handle the error to prevent the entire chain from breaking on a single failure
          // e.g., return Promise.resolve() here to keep the queue running for subsequent tasks.
        });
    });
  }
}

module.exports = SequentialPromiseQueue;
