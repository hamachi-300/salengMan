import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import styles from "./Chat.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";
import ImageViewer from "../../components/ImageViewer";

interface Message {
    id: string;
    sender_id: string;
    text: string | null;
    image_url: string | null;
    timestamp: string;
}

interface ChatData {
    id: string;
    messages: Message[];
}

function Chat() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { user } = useUser();

    // Determine back path: post detail if backToDetail is present, otherwise buyer list or history
    const postId = location.state?.postId;
    const backToDetail = location.state?.backToDetail;
    const backPath = backToDetail && postId ? `/history/${postId}` : (postId ? `/history/${postId}/buyers` : '/history');

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image viewer state
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        fetchChat();
        // Poll for new messages every 5 seconds
        const interval = setInterval(fetchChat, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchChat = async () => {
        const token = getToken();
        if (!token || !id) return;

        try {
            const data: ChatData = await api.getChat(token, id);
            // Determine if there are new messages to scroll
            setMessages(data.messages || []);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch chat:", error);
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() && !fileInputRef.current?.files?.length) return;

        const token = getToken();
        if (!token || !id) return;

        setSending(true);
        try {
            await api.sendMessage(token, id, inputMessage);
            setInputMessage("");
            fetchChat();
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const token = getToken();
        if (!token || !id) return;

        setSending(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await api.sendMessage(token, id, undefined, base64String);
                fetchChat();
                // Clear file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Failed to upload image:", error);
        } finally {
            setSending(false);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className={styles.loading}>Loading chat...</div>;
    }

    return (
        <div className={styles.container}>
            <PageHeader title="Chat" backTo={backPath} />

            <div className={styles.messageList}>
                {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                        <div
                            key={msg.id}
                            className={`${styles.messageRow} ${isMe ? styles.myMessageRow : styles.otherMessageRow}`}
                        >
                            <div className={`${styles.messageBubble} ${isMe ? styles.myMessage : styles.otherMessage}`}>
                                {msg.image_url && (
                                    <img
                                        src={msg.image_url}
                                        alt="Shared"
                                        className={styles.sharedImage}
                                        onClick={() => {
                                            setViewerImages([msg.image_url!]);
                                            setViewerIndex(0);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                )}
                                {msg.text && <p className={styles.messageText}>{msg.text}</p>}
                                <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                    <button className={styles.iconButton}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                    </button>

                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={sending}
                    />

                    <button className={styles.iconButton} onClick={triggerFileUpload} disabled={sending}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </div>

            {/* Image Viewer */}
            {viewerImages.length > 0 && (
                <ImageViewer
                    images={viewerImages}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerImages([])}
                />
            )}
        </div>
    );
}

export default Chat;
