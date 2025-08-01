// src/services/WebSocketService.js
/**
 * WebSocketService Class
 * Manages WebSocket connections to AWS API Gateway WebSocket API.
 * Handles connection, messaging, subscriptions, and reconnections.
 */
class WebSocketService {
    constructor() {
        this.socket = null; // Holds the WebSocket instance
        this.subscribers = new Map(); // Stores event types and their callback Sets: Map<string, Set<Function>>
        this.connectionPromise = null; // Promise tracking the current connection attempt
        this.resolveConnectionPromise = null; // Resolver function for the connectionPromise

        // Reconnection Logic Parameters
        this.reconnectInterval = 5000; // Initial reconnect delay (ms)
        this.maxReconnectInterval = 30000; // Maximum reconnect delay (ms)
        this.reconnectAttempts = 0; // Counter for reconnect attempts
        this.maxReconnectAttempts = 10; // Limit for reconnection attempts
        this.shouldReconnect = true; // Flag to control automatic reconnection
        this.reconnectTimeoutId = null; // Stores the setTimeout ID for cancelling

        this.isConfigured = false; // Flag to track if URL is valid

        // Bind methods to ensure 'this' context is correct when used as callbacks
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
        this.getWebSocketUrl = this.getWebSocketUrl.bind(this);
        this.scheduleReconnect = this.scheduleReconnect.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.ensureConnected = this.ensureConnected.bind(this);

        // Initial check if URLs are configured
        this.checkConfiguration();
    }

    // --- Configuration Check ---
    checkConfiguration() {
        const url = this.getWebSocketUrl();
        if (url && url.startsWith('wss://') && url.includes('.execute-api.')) {
            this.isConfigured = true;
            console.info("WebSocketService: Configuration detected. WebSocket features enabled.");
        } else {
            this.isConfigured = false;
            console.error(`WebSocketService: WebSocket URL is invalid or a placeholder (${url}). Real-time features will be disabled.`);
        }
    }

    // --- Connection Management ---
    getWebSocketUrl() {
        // Using the URL you provided for the Production stage
        const webSocketUrl = 'wss://s6a3slvbha.execute-api.us-east-1.amazonaws.com/Prod/'; // YOUR CONFIRMED URL

        // You might add logic here later if you have different stage URLs
        // if (process.env.REACT_APP_STAGE === 'dev') { return 'wss://.../dev'; }
        console.log(`WebSocketService: Using URL: ${webSocketUrl}`);
        return webSocketUrl;
    }

    connect() {
        // Don't attempt if not configured or already connected/connecting
        if (!this.isConfigured) {
            console.warn("WebSocketService: Connection skipped - URL not configured or invalid.");
            return Promise.resolve(false); // Indicate connection didn't happen
        }
        if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
            console.log('WebSocketService: Already connecting or connected.');
            return this.connectionPromise || Promise.resolve(true); // Return existing promise or resolve true
        }

        // Clear any pending reconnect timeouts
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        this.shouldReconnect = true; // Enable auto-reconnect for this attempt cycle
        const wsUrl = this.getWebSocketUrl();

        console.log(`WebSocketService: Attempting to connect to ${wsUrl}...`);

        // Create a new promise for this connection attempt
        this.connectionPromise = new Promise((resolve) => {
            this.resolveConnectionPromise = resolve;
        });

        try {
            this.socket = new WebSocket(wsUrl);
            this.socket.onopen = this.handleOpen;
            this.socket.onmessage = this.handleMessage;
            this.socket.onclose = this.handleClose;
            this.socket.onerror = this.handleError;
        } catch (error) {
            console.error('WebSocketService: Error creating WebSocket instance:', error);
            // Simulate a close event to trigger cleanup and potential reconnect
            this.handleClose({ code: 4001, reason: 'WebSocket constructor failed', wasClean: false });
             // Ensure promise is resolved as false if creation fails
             if(this.resolveConnectionPromise) { this.resolveConnectionPromise(false); this.resolveConnectionPromise = null; } // Indicate failure
             this.connectionPromise = null;
        }
        return this.connectionPromise; // Return the promise for this attempt
    }

    handleOpen() {
        console.log('WebSocketService: Connection established.');
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        // Resolve the current connection promise to true (success)
        if (this.resolveConnectionPromise) {
            this.resolveConnectionPromise(true);
            this.resolveConnectionPromise = null; // Clear resolver
            this.connectionPromise = null; // Clear promise reference
        }
    }

    handleClose(event) {
        const code = event?.code ?? 1006; // Use 1006 for abnormal closure if no code
        const reason = event?.reason ?? 'Connection closed unexpectedly';
        const wasClean = event?.wasClean ?? false;
        console.log(`WebSocketService: Connection closed. Code: ${code}, Reason: "${reason}", Clean: ${wasClean}`);

        this.socket = null; // Clear the socket instance

        // Resolve the current connection promise to false (failure/closure) if it exists
        if (this.resolveConnectionPromise) {
            this.resolveConnectionPromise(false);
            this.resolveConnectionPromise = null;
            this.connectionPromise = null;
        }

        // Attempt to reconnect if configured, enabled, and not a clean closure (or if desired for clean closures too)
        if (this.isConfigured && this.shouldReconnect) {
            this.scheduleReconnect();
        } else {
            console.log('WebSocketService: Auto-reconnection disabled or not configured.');
        }
    }

    handleError(errorEvent) {
        // Log the error. The 'close' event will usually follow immediately and handle reconnection.
        console.error('WebSocketService: WebSocket Error Event occurred.', errorEvent);
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`WebSocketService: Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping automatic reconnection.`);
            this.shouldReconnect = false; // Stop trying
            return;
        }
        this.reconnectAttempts++;

        // Exponential backoff with jitter
        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1) + (Math.random() * 1000), // Add jitter
            this.maxReconnectInterval
        );

        console.log(`WebSocketService: Attempting reconnect #${this.reconnectAttempts} in ${Math.round(delay / 1000)}s...`);

        // Store timeout ID so it can be cleared if connect() is called manually
        this.reconnectTimeoutId = setTimeout(this.connect, delay);
    }

    disconnect() {
        console.log('WebSocketService: Disconnecting manually.');
        this.shouldReconnect = false; // Disable auto-reconnect on manual disconnect

        // Clear any pending reconnect timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Manual disconnect by client'); // 1000 indicates normal closure
        }
        this.socket = null;

        // Resolve any pending connection promise to false
        if (this.resolveConnectionPromise) {
            this.resolveConnectionPromise(false);
            this.resolveConnectionPromise = null;
            this.connectionPromise = null;
        }
    }

    /**
     * Ensures the WebSocket is connected, attempting to connect if necessary.
     * Throws an error if connection fails or service is not configured.
     */
    async ensureConnected() {
        if (!this.isConfigured) {
            throw new Error("WebSocketService: Cannot ensure connection, service is not configured.");
        }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return true; // Already connected
        }

        // If not connected and no connection attempt is in progress, start one.
        if (!this.connectionPromise) {
            console.log("WebSocketService: Not connected. Initiating connection for ensureConnected...");
            this.connect(); // Initiate connection, returns the promise
        }

        // Wait for the current or new connection attempt to complete
        try {
             console.log("WebSocketService: Waiting for connection promise...");
             const connected = await this.connectionPromise; // Wait for connect() to resolve
             if (!connected) {
                 throw new Error("WebSocket connection attempt failed.");
             }
             console.log("WebSocketService: ensureConnected confirmed connection is open.");
             return true; // Connection successful
        } catch (error) {
             console.error("WebSocketService: Error during ensureConnected:", error);
             throw new Error("WebSocketService: Failed to establish connection."); // Rethrow or handle
        }
    }


    // --- Message Handling & Subscriptions ---
    handleMessage(event) {
        let messageData;
        try {
            messageData = JSON.parse(event.data);
            console.log('WebSocketService: Message received:', messageData);

            // Determine the event type based on common patterns (type, action, or fallback)
            // Adjust this based on the actual structure of messages from YOUR backend
            const eventType = messageData.type || messageData.action || (messageData.message ? 'message' : 'unknown');

            if (this.subscribers.has(eventType)) {
                // Determine the payload - adjust based on YOUR backend message structure
                const payload = messageData.payload || messageData.data || messageData;

                // Notify all subscribers for this event type
                this.subscribers.get(eventType).forEach(callback => {
                    try {
                        callback(payload);
                    } catch (e) {
                        console.error(`WebSocketService: Error in subscriber callback for event "${eventType}":`, e);
                    }
                });
            } else {
                console.log(`WebSocketService: No subscribers registered for event type "${eventType}"`);
            }
        } catch (error) {
            console.error('WebSocketService: Error parsing incoming message or no JSON:', error, 'Raw data:', event.data);
        }
    }

    /**
     * Subscribes a callback function to a specific message event type.
     * @param {string} eventType - The type/action field expected in the incoming message.
     * @param {Function} callback - The function to call when a message of eventType is received. Receives the message payload.
     * @returns {Function} An unsubscribe function. Call this function to remove the subscription.
     */
    subscribe(eventType, callback) {
        if (typeof callback !== 'function') {
            console.error("WebSocketService: Subscription failed. Provided callback is not a function for event:", eventType);
            return () => {}; // Return a no-op function
        }
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);
        console.log(`WebSocketService: Subscribed to event "${eventType}"`);

        // Return an unsubscribe function
        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Removes a specific callback subscription for an event type.
     * @param {string} eventType - The event type to unsubscribe from.
     * @param {Function} callback - The specific callback function to remove.
     */
    unsubscribe(eventType, callback) {
        if (this.subscribers.has(eventType)) {
            const subs = this.subscribers.get(eventType);
            if (subs.delete(callback)) { // delete returns true if element existed and was removed
                console.log(`WebSocketService: Unsubscribed callback from event "${eventType}"`);
            }
            // Clean up the Set and Map if no subscribers remain for this type
            if (subs.size === 0) {
                this.subscribers.delete(eventType);
                console.log(`WebSocketService: Removed event type "${eventType}" as no subscribers remain.`);
            }
        } else {
             console.log(`WebSocketService: No subscribers found for event type "${eventType}" to unsubscribe.`);
        }
    }

    /**
     * Sends a message object (usually containing an 'action') to the WebSocket server.
     * Ensures connection is established before sending.
     * @param {object} message - The message object to send (will be JSON.stringified).
     */
    async sendMessage(message) {
        console.log("WebSocketService: Attempting to send message:", message);
        try {
            await this.ensureConnected(); // Wait for connection if not already open
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
                console.log('WebSocketService: Message sent successfully.');
            } else {
                // This should ideally be caught by ensureConnected, but double-check
                throw new Error("WebSocket socket is not open. Cannot send message.");
            }
        } catch (error) {
            console.error('WebSocketService: Failed to send message:', error);
            // Optionally: Implement offline queueing or notify user
            throw error; // Rethrow for calling component to handle
        }
    }
}

// Create and export a singleton instance of the service
const webSocketService = new WebSocketService();
export default webSocketService;