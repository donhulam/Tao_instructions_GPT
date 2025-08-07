
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './types';
import { generateInstructionsStream, FileData } from './services/geminiService';

// Helper to convert File to base64
const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

// Helper component for rendering Markdown-like text
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g).filter(part => part);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={index}>{part.split('\n').map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line.trim().startsWith('- ') ? <li className="ml-5 list-item">{line.substring(2)}</li> : line}
            {lineIndex < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}</React.Fragment>;
      })}
    </>
  );
};


// Helper component for the copy button
const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            console.error('Lỗi sao chép:', err);
        });
    }, [textToCopy]);

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out ${
                copied 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800'
            }`}
            aria-label={copied ? "Đã sao chép" : "Sao chép nội dung"}
            title={copied ? 'Đã sao chép' : 'Sao chép'}
            disabled={!textToCopy.trim()}
        >
            {copied ? <i className="fas fa-check"></i> : <i className="far fa-copy"></i>}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
    );
};

// Introduction Modal Component
const IntroductionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Giới thiệu & Hướng dẫn sử dụng</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                
                <div className="prose prose-blue max-w-none text-gray-700">
                    <h3 className="text-gray-800">Giới thiệu</h3>
                    <p>
                        Chào mừng bạn đến với <strong>Trợ lý Thiết kế GPT (GEM) cá nhân hóa</strong>! Công cụ này được tạo ra để giúp bạn xây dựng phần "Chỉ dẫn" (Instructions) một cách chuyên nghiệp, logic và hiệu quả cho các GPT tùy chỉnh của bạn.
                    </p>
                    <p>
                        Thay vì phải suy nghĩ về cấu trúc, vai trò, và các quy tắc phức tạp, bạn chỉ cần cung cấp ý tưởng cốt lõi. Trợ lý AI sẽ phân tích và tự động tạo ra một bộ chỉ dẫn hoàn chỉnh theo cấu trúc 10 phần tiêu chuẩn, giúp GPT của bạn hoạt động đúng mục tiêu và hiệu quả nhất.
                    </p>

                    <h3 className="text-gray-800">Hướng dẫn sử dụng chi tiết</h3>
                    
                    <h4>Bước 1: Cung cấp ý tưởng cho GPT của bạn</h4>
                    <p>Bạn có hai cách để cung cấp thông tin đầu vào cho Trợ lý AI:</p>
                    <ul>
                        <li>
                            <strong>Nhập mô tả trực tiếp:</strong> Gõ vào ô chat mô tả chi tiết nhất có thể về GPT bạn muốn tạo. Càng chi tiết, kết quả càng chính xác. Hãy trả lời các câu hỏi như:
                            <ul className="list-disc pl-5">
                                <li>GPT này dùng để làm gì? (Ví dụ: viết bài marketing, phân tích dữ liệu, dạy học...)</li>
                                <li>Đối tượng người dùng là ai? (Ví dụ: học sinh, lập trình viên, nhà quản lý...)</li>
                                <li>Văn phong mong muốn là gì? (Ví dụ: chuyên nghiệp, hài hước, thân thiện...)</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Tải lên tài liệu:</strong> Nhấn vào biểu tượng kẹp giấy <i className="fas fa-paperclip text-sm"></i> để tải lên một hoặc nhiều tệp tin (<code>.pdf</code>, <code>.doc</code>, <code>.docx</code>, <code>.txt</code>) chứa nội dung mô tả, bản nháp, hoặc các tài liệu liên quan đến GPT của bạn.
                        </li>
                    </ul>

                    <h4>Bước 2: Gửi yêu cầu và chờ xử lý</h4>
                    <p>
                        Sau khi đã nhập mô tả hoặc tải tệp lên, nhấn nút gửi <i className="fas fa-paper-plane text-sm"></i>. Trợ lý AI sẽ bắt đầu phân tích yêu cầu của bạn. Quá trình này có thể mất vài giây.
                    </p>

                    <h4>Bước 3: Nhận và sử dụng "Instructions"</h4>
                    <p>
                        AI sẽ trả về một bộ chỉ dẫn hoàn chỉnh được cấu trúc thành 10 phần rõ ràng.
                    </p>
                    <ul>
                        <li>Đọc và kiểm tra lại nội dung để đảm bảo nó đúng với mong muốn của bạn.</li>
                        <li>Sử dụng nút <strong>"Sao chép"</strong> ở cuối phản hồi để lấy toàn bộ nội dung.</li>
                        <li>Dán (Paste) nội dung đã sao chép vào ô "Instructions" khi bạn tạo hoặc cấu hình GPT trên nền tảng của OpenAI hoặc các nền tảng tương tự.</li>
                    </ul>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mt-4 rounded-r-lg" role="alert">
                        <p className="font-bold">Mẹo hay</p>
                        <p>Nếu bạn không chắc chắn về yêu cầu của mình, đừng lo! AI được lập trình để đặt câu hỏi gợi mở nhằm làm rõ ý tưởng của bạn trước khi tạo ra kết quả cuối cùng.</p>
                    </div>
                </div>

                 <div className="text-right mt-6 pt-4 border-t border-gray-200">
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        Đã hiểu
                    </button>
                </div>
            </div>
        </div>
    );
};

// Suggestion Prompts data and component
interface Suggestion {
    title: string;
    description: string;
    prompt: string;
    icon: string;
}

const suggestions: Suggestion[] = [
    {
        title: "Soạn thảo Công văn & Báo cáo",
        description: "Tạo nhanh công văn, báo cáo, tờ trình theo đúng thể thức.",
        prompt: "Tạo một GPT chuyên soạn thảo các loại văn bản hành chính công vụ như công văn, báo cáo, tờ trình, kế hoạch. GPT cần tuân thủ nghiêm ngặt thể thức trình bày văn bản theo Nghị định 30/2020/NĐ-CP, sử dụng văn phong hành chính, trang trọng, và có khả năng tùy chỉnh nội dung dựa trên các yêu cầu cụ thể.",
        icon: "fas fa-file-word"
    },
    {
        title: "Tóm tắt Văn bản Pháp luật",
        description: "Rút gọn nội dung chính của thông tư, nghị định, luật.",
        prompt: "Xây dựng một GPT có khả năng đọc và tóm tắt các văn bản quy phạm pháp luật (Luật, Nghị định, Thông tư). GPT phải nhận diện được các ý chính, đối tượng áp dụng, và những điểm mới quan trọng của văn bản. Kết quả trả về cần ngắn gọn, rõ ràng, trình bày dưới dạng gạch đầu dòng để dễ nắm bắt.",
        icon: "fas fa-balance-scale"
    },
    {
        title: "Xây dựng Nội dung Trình chiếu",
        description: "Chuẩn bị slide cho cuộc họp, hội nghị, báo cáo chuyên đề.",
        prompt: "Thiết kế một GPT chuyên tạo dàn ý và nội dung chi tiết cho các bài trình chiếu (PowerPoint). Dựa trên chủ đề, GPT sẽ đề xuất cấu trúc, soạn thảo nội dung cho từng slide theo dạng gạch đầu dòng súc tích, và gợi ý các số liệu hoặc biểu đồ cần có để minh họa.",
        icon: "fas fa-file-powerpoint"
    },
    {
        title: "Soạn thảo Diễn văn, Phát biểu",
        description: "Viết bài phát biểu khai mạc, bế mạc, chào mừng sự kiện.",
        prompt: "Tạo một GPT chuyên viết các bài phát biểu cho lãnh đạo trong các cuộc họp, hội nghị, sự kiện. GPT cần nắm bắt được mục đích của buổi lễ (khai mạc, tổng kết...), sử dụng ngôn từ trang trọng, hùng hồn, có cấu trúc logic và phù hợp với vai vế của người phát biểu.",
        icon: "fas fa-microphone-alt"
    },
    {
        title: "Trả lời Thư Công dân",
        description: "Soạn thảo văn bản trả lời đơn thư, kiến nghị, phản ánh.",
        prompt: "Phát triển một GPT hỗ trợ soạn thảo văn bản trả lời đơn thư, kiến nghị của công dân. GPT cần sử dụng văn phong lịch sự, tôn trọng, trích dẫn đúng các quy định pháp luật liên quan và giải đáp vấn đề một cách rõ ràng, đúng thẩm quyền.",
        icon: "fas fa-pen-to-square"
    }
];

const SuggestionPrompts: React.FC<{ onSelect: (prompt: string) => void; disabled: boolean; }> = ({ onSelect, disabled }) => (
    <div className="max-w-3xl mx-auto">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 px-1">Gợi ý cho bạn hoặc mô tả ý tưởng của riêng bạn ở bên dưới:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion) => (
                <button 
                    key={suggestion.title}
                    onClick={() => onSelect(suggestion.prompt)}
                    disabled={disabled}
                    className="bg-white border border-gray-200 p-4 rounded-lg text-left hover:bg-gray-50 hover:border-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center mb-1">
                        <i className={`${suggestion.icon} text-blue-600 mr-3 w-5 text-center`}></i>
                        <p className="font-semibold text-gray-800">{suggestion.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 pl-8">{suggestion.description}</p>
                </button>
            ))}
        </div>
    </div>
);


const initialChatState: ChatMessage[] = [
    {
      role: 'bot',
      content: 'Xin chào! Tôi là Trợ lý Thiết kế GPT (GEM) cá nhân hóa. Hãy cho tôi biết ý tưởng về GPT bạn muốn xây dựng, hoặc đính kèm một tệp tài liệu để bắt đầu.'
    }
];

// Main App Component
const App: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatState);
  const [userInput, setUserInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewChat = useCallback(() => {
    setChatHistory(initialChatState);
    setUserInput('');
    setSelectedFiles([]);
    setError(null);
    setIsLoading(false);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);
  
  useEffect(() => {
    if (error) {
        const timer = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [error]);

  const handleUserInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if(textareaRef.current){
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        const allowedTypes = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
            'text/plain'
        ];
        
        let hasError = false;
        const validFiles = newFiles.filter(file => {
            if (hasError) return false;
            if (!allowedTypes.includes(file.type)) {
                setError('Định dạng tệp không được hỗ trợ. Vui lòng chọn .pdf, .doc, .docx, hoặc .txt.');
                hasError = true;
                return false;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError('Kích thước tệp không được vượt quá 10MB.');
                hasError = true;
                return false;
            }
            return true;
        });

        if (!hasError) {
             setSelectedFiles(prevFiles => {
                const existingFileNames = new Set(prevFiles.map(f => f.name));
                const uniqueNewFiles = validFiles.filter(f => !existingFileNames.has(f.name));
                return [...prevFiles, ...uniqueNewFiles];
            });
            setError(null);
        }
    }
    if(e.target) e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const submitPrompt = useCallback(async (promptText: string, files: File[]) => {
    const trimmedInput = promptText.trim();
    if ((!trimmedInput && files.length === 0) || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    let userMessageContent = trimmedInput;
    if (files.length > 0) {
        const fileNames = files.map(f => `- ${f.name}`).join('\n');
        userMessageContent = `Tệp đính kèm:\n${fileNames}${trimmedInput ? `\n\n${trimmedInput}` : ''}`;
    }

    setChatHistory(prevHistory => [...prevHistory, { role: 'user', content: userMessageContent }]);
    setUserInput('');
    setSelectedFiles([]);

    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
        let filesData: FileData[] | undefined = undefined;
        if (files.length > 0) {
            filesData = await Promise.all(
              files.map(async (file) => {
                const base64Data = await toBase64(file);
                return { base64Data, mimeType: file.type };
              })
            );
        }

        const stream = await generateInstructionsStream(trimmedInput, filesData);
        
        setChatHistory(prev => [...prev, { role: 'bot', content: '' }]);

        let fullResponse = '';
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            fullResponse += chunkText;
            setChatHistory(prev => {
                const updatedHistory = [...prev];
                if (updatedHistory.length > 0) {
                    updatedHistory[updatedHistory.length - 1].content = fullResponse;
                }
                return updatedHistory;
            });
        }

    } catch (err: any) {
        const errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại. Lỗi: " + err.message;
        setError(errorMessage);
        setChatHistory(prev => [...prev, { role: 'bot', content: errorMessage}]);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading]);

  const handleSend = () => {
    submitPrompt(userInput, selectedFiles);
  };

  const handleSuggestionClick = (prompt: string) => {
    submitPrompt(prompt, []);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans">
      {isIntroModalOpen && <IntroductionModal onClose={() => setIsIntroModalOpen(false)} />}
      <header className="p-4 border-b border-gray-200 shadow-md bg-white flex items-center justify-between">
        <button
          onClick={() => setIsIntroModalOpen(true)}
          className="text-2xl text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full w-10 h-10 flex items-center justify-center"
          aria-label="Mở phần giới thiệu và hướng dẫn"
          title="Giới thiệu & Hướng dẫn"
        >
          <i className="fas fa-info-circle"></i>
        </button>
        <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">🚀 Trợ lý Thiết kế GPT (GEM) cá nhân hóa</h1>
            <p className="text-sm text-gray-600">Tạo Chỉ dẫn (Instructions) chuyên nghiệp cho GPT (GEM) của bạn</p>
        </div>
        <button
          onClick={handleNewChat}
          className="text-2xl text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full w-10 h-10 flex items-center justify-center"
          aria-label="Nhiệm vụ mới"
          title="Nhiệm vụ mới"
        >
          <i className="fas fa-plus-square"></i>
        </button>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
                <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl bg-blue-600 text-white rounded-br-none">
                    <div className="prose prose-p:my-2 prose-headings:my-3 whitespace-pre-wrap">
                        <MarkdownRenderer text={msg.content} />
                    </div>
                </div>
            ) : (
                <div className="max-w-xl lg:max-w-2xl flex flex-col bg-white text-gray-800 rounded-2xl rounded-bl-none overflow-hidden border border-gray-200">
                    <div className="prose prose-p:my-2 prose-headings:my-3 whitespace-pre-wrap px-4 pt-3 pb-2">
                        <MarkdownRenderer text={msg.content} />
                    </div>
                    {msg.content.trim() && !msg.content.startsWith("Đã có lỗi xảy ra") && (
                        <div className="px-4 pb-3 pt-1 flex justify-end">
                            <CopyButton textToCopy={msg.content} />
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}

        {chatHistory.length === 1 && !isLoading && (
            <SuggestionPrompts onSelect={handleSuggestionClick} disabled={isLoading} />
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-none flex items-center space-x-2 border border-gray-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="p-4 bg-gray-100/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
           {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-2 text-sm" role="alert">
                    <strong className="font-bold">Lỗi: </strong>
                    <span>{error}</span>
                </div>
            )}
            {selectedFiles.length > 0 && (
                <div className="bg-blue-100 rounded-lg p-2 mb-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-blue-800 text-sm font-medium px-2 py-1 bg-white rounded">
                            <div className="flex items-center min-w-0">
                                <i className="fas fa-file-alt mr-2 flex-shrink-0"></i>
                                <span className="truncate" title={file.name}>{file.name}</span>
                            </div>
                            <button 
                                onClick={() => handleRemoveFile(index)} 
                                className="text-gray-500 hover:text-red-600 ml-2 flex-shrink-0"
                                aria-label={`Xóa tệp ${file.name}`}
                                title={`Xóa tệp ${file.name}`}
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}
          <div className="flex items-end bg-white rounded-xl p-2 border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-300 transition-all duration-200">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-colors focus:outline-none disabled:text-gray-400"
              aria-label="Đính kèm tệp"
              title="Đính kèm tệp"
            >
              <i className="fas fa-paperclip"></i>
            </button>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleUserInput}
              onKeyDown={handleKeyDown}
              placeholder="Hãy mô tả chi tiết về GPT (GEM) của bạn"
              className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none max-h-40 px-2"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!userInput.trim() && selectedFiles.length === 0)}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              title="Gửi"
            >
              {isLoading ? 'Đang xử lý...' : <i className="fas fa-paper-plane"></i>}
            </button>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Phát triển bởi: <a href="http://trolyai.io.vn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Đỗ Như Lâm</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
