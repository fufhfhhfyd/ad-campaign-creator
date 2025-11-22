import { useState, useEffect } from 'react';
import { Video, Settings as SettingsIcon, Plus, RefreshCw, Loader2, Upload, PlayCircle, CheckCircle2, Download, X } from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

type View = 'dashboard' | 'create' | 'settings';
type TabType = 'reels' | 'product' | 'ugc';

interface VideoPost {
  id: string;
  video_url: string | null;
  post_title: string;
  caption: string;
  hashtag: string | null;
  youtube_post_status: string;
  instagram_post_status: string;
  facebook_post_status: string;
}

interface AppSettings {
  supabaseUrl: string;
  supabaseKey: string;
  n8nGenerateWebhook: string;
  n8nPostWebhook: string;
  tableName: string;
}

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    supabaseUrl: '',
    supabaseKey: '',
    n8nGenerateWebhook: '',
    n8nPostWebhook: '',
    tableName: 'social_media_videos'
  });

  const getSupabase = (): SupabaseClient | null => {
    if (!settings.supabaseUrl || !settings.supabaseKey) return null;
    return createClient(settings.supabaseUrl, settings.supabaseKey);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const fetchVideos = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      showNotification('error', 'Please configure settings first');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(settings.tableName)
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}. Check table name "${settings.tableName}" and RLS policies.`);
      }
      
      console.log('Fetched videos:', data);
      setVideos(data || []);
      
      if (data && data.length > 0) {
        showNotification('success', `Loaded ${data.length} video(s)`);
      }
    } catch (err: any) {
      showNotification('error', err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Download started!');
  };

  const handlePostToSocials = async (video: VideoPost) => {
    // Use Post webhook if configured, otherwise fall back to Generate webhook
    const webhookUrl = settings.n8nPostWebhook || settings.n8nGenerateWebhook;
    
    if (!webhookUrl) {
      showNotification('error', 'Please configure at least one n8n webhook in Settings');
      return;
    }

    try {
      console.log('Sending to n8n webhook (Post to Socials):', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });

      if (!response.ok) throw new Error('Failed to post to socials');
      
      showNotification('success', 'Posted to social media successfully!');
    } catch (err: any) {
      console.error('Post to socials error:', err);
      showNotification('error', err.message);
    }
  };

  const updateVideoField = async (videoId: string, field: 'post_title' | 'caption', value: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from(settings.tableName)
        .update({ [field]: value })
        .eq('id', videoId);

      if (error) throw error;
      
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, [field]: value } : v));
      showNotification('success', 'Updated successfully');
    } catch (err: any) {
      console.error('Update error:', err);
      showNotification('error', err.message);
    }
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    if (settings.supabaseUrl && settings.supabaseKey && activeView === 'dashboard') {
      fetchVideos();
    }
  }, [settings.supabaseUrl, settings.supabaseKey, activeView]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-medium">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AdGen Studio</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Social Media Ads</p>
              </div>
            </div>

            <nav className="flex gap-2">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                  activeView === 'dashboard'
                    ? 'bg-primary text-primary-foreground shadow-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('create')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeView === 'create'
                    ? 'bg-gradient-pink text-white shadow-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Plus size={18} />
                Create Ad
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                  activeView === 'settings'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <SettingsIcon size={18} />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'create' && <CreateVideoView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );

  function DashboardView() {
    const [editingFields, setEditingFields] = useState<{[key: string]: {post_title: string, caption: string}}>({});

    const handleFieldChange = (videoId: string, field: 'post_title' | 'caption', value: string) => {
      setEditingFields(prev => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          [field]: value
        }
      }));
    };

    const handleFieldBlur = (videoId: string, field: 'post_title' | 'caption') => {
      const editedValue = editingFields[videoId]?.[field];
      const currentVideo = videos.find(v => v.id === videoId);
      
      if (editedValue !== undefined && currentVideo && editedValue !== currentVideo[field]) {
        updateVideoField(videoId, field, editedValue);
      }
    };

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Post Preview</h2>
            <p className="text-muted-foreground mt-1">Manage and publish your generated video posts</p>
          </div>
          <button 
            onClick={fetchVideos} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl hover:bg-secondary text-foreground shadow-soft transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {videos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border shadow-soft">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-blue flex items-center justify-center">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">No posts found</p>
                  <p className="text-muted-foreground mt-1">Create your first ad to get started!</p>
                </div>
                <button
                  onClick={() => setActiveView('create')}
                  className="mt-4 px-6 py-3 bg-gradient-pink text-white font-semibold rounded-xl shadow-medium hover:shadow-large transition-all"
                >
                  Create First Ad
                </button>
              </div>
            </div>
          ) : (
            videos.map((video) => (
              <div key={video.id} className="bg-white rounded-2xl shadow-medium border border-border overflow-hidden flex flex-col md:flex-row p-6 gap-8 hover:shadow-large transition-all">
                
                {/* Media Display */}
                <div className="w-full md:w-1/3 flex-shrink-0 bg-slate-900 rounded-xl overflow-hidden relative aspect-[9/16] md:aspect-auto md:h-[400px]">
                  {video.video_url ? (
                    <>
                      {video.video_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={video.video_url} 
                          alt={video.post_title}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <video 
                          src={video.video_url} 
                          controls 
                          className="w-full h-full object-cover" 
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted">
                      <Loader2 className="w-10 h-10 animate-spin mb-2 text-primary" />
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                      <input
                        type="text"
                        value={editingFields[video.id]?.post_title ?? video.post_title ?? ''}
                        onChange={(e) => handleFieldChange(video.id, 'post_title', e.target.value)}
                        onBlur={() => handleFieldBlur(video.id, 'post_title')}
                        className="w-full text-xl font-bold text-foreground p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        placeholder="Enter title..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                      <textarea
                        value={editingFields[video.id]?.caption ?? video.caption ?? ''}
                        onChange={(e) => handleFieldChange(video.id, 'caption', e.target.value)}
                        onBlur={() => handleFieldBlur(video.id, 'caption')}
                        className="w-full text-foreground text-sm leading-relaxed bg-background p-4 rounded-lg border border-border max-h-32 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        placeholder="Enter description..."
                      />
                    </div>

                    {video.hashtag && (
                       <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</label>
                          <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md break-all">
                                {video.hashtag}
                              </span>
                          </div>
                       </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-border space-y-3">
                      {video.video_url && (
                        <>
                          <button 
                              onClick={() => handleDownload(video.video_url!, `ad_${video.id}.${video.video_url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i)?.[1] || 'mp4'}`)}
                              className="w-full py-3 bg-gradient-blue text-white font-bold rounded-xl shadow-medium hover:shadow-large transition-all flex justify-center items-center gap-2"
                          >
                              <Download size={18} />
                              Download Media
                          </button>
                          <button 
                              onClick={() => handlePostToSocials(video)}
                              className="w-full py-3 bg-gradient-pink text-white font-bold rounded-xl shadow-medium hover:shadow-large transition-all flex justify-center items-center gap-2"
                          >
                              <CheckCircle2 size={18} />
                              Post to Social Media
                          </button>
                        </>
                      )}
                    <p className="text-center text-[10px] text-muted-foreground mt-2">
                      ID: {video.id}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function CreateVideoView() {
    const [activeTab, setActiveTab] = useState<TabType>('reels');
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'Portrait' | 'Landscape'>('Portrait');

    // Load persisted data on mount (including image preview)
    useEffect(() => {
      const saved = localStorage.getItem('createAdFormData');
      if (saved) {
        const data = JSON.parse(saved);
        setPrompt(data.prompt || '');
        setProductName(data.productName || '');
        setProductDescription(data.productDescription || '');
        setAspectRatio(data.aspectRatio || 'Portrait');
        // Restore image preview if exists
        if (data.filePreview) {
          setFilePreview(data.filePreview);
        }
      }
    }, []);

    // Persist data on change (including image preview)
    useEffect(() => {
      const formData = {
        prompt,
        productName,
        productDescription,
        aspectRatio,
        filePreview // Save the base64 preview so images persist
      };
      localStorage.setItem('createAdFormData', JSON.stringify(formData));
    }, [prompt, productName, productDescription, aspectRatio, filePreview]);

    const handleFileChange = (selectedFile: File | null) => {
      setFile(selectedFile);
      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Check if at least one webhook is configured
      const webhookUrl = settings.n8nGenerateWebhook || settings.n8nPostWebhook;
      
      if (!webhookUrl) {
        showNotification('error', 'Please configure at least one n8n webhook in Settings!');
        return;
      }

      setLoading(true);
      try {
        // Prepare file data for n8n
        let fileData = null;
        if (file || filePreview) {
          // Use existing file or restore from preview
          const base64 = file 
            ? await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              })
            : filePreview; // Use saved preview if no new file

          fileData = {
            name: file?.name || 'uploaded-image',
            type: file?.type || 'image/jpeg',
            data: base64
          };
        }

        // Send data directly to n8n webhook - NO DATABASE INSERT for "Create Ad"
        const webhookPayload = {
          // Ad creation details
          type: activeTab,
          post_title: activeTab === 'reels' 
            ? 'Update Product Image' 
            : (productName || 'Ad Campaign'),
          caption: prompt,
          prompt_text: prompt,
          product_name: productName || null,
          product_description: productDescription || null,
          aspect_ratio: aspectRatio,
          file: fileData,
          timestamp: new Date().toISOString()
        };

        // Use Generate webhook if configured, otherwise fall back to Post webhook
        const targetWebhook = settings.n8nGenerateWebhook || settings.n8nPostWebhook;
        
        console.log('Sending to n8n webhook (Create Ad):', targetWebhook);
        console.log('Webhook payload:', { ...webhookPayload, file: fileData ? 'FILE_DATA_PRESENT' : null });

        const webhookResponse = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          throw new Error(`Webhook failed (${webhookResponse.status}): ${errorText}`);
        }
        
        console.log('Webhook response:', await webhookResponse.text());
        showNotification('success', 'Ad generation request sent successfully!');
        // Don't clear form data - data persists until manually cleared
        setActiveView('dashboard');

      } catch (err: any) {
        console.error('Submit error:', err);
        showNotification('error', err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-8 text-center">
             <h2 className="text-3xl font-bold text-foreground">Create New Ad</h2>
             <p className="text-muted-foreground mt-2">Select your format and let AI handle the rest</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="flex border-b bg-muted/50">
            <button 
              onClick={() => { setActiveTab('reels'); setFile(null); setFilePreview(null); }}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'reels' ? 'bg-white border-b-2 border-accent text-accent shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Update Product Image
            </button>
            <button 
              onClick={() => setActiveTab('product')}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'product' ? 'bg-white border-b-2 border-primary text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Product Ads
            </button>
            <button 
              onClick={() => setActiveTab('ugc')}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'ugc' ? 'bg-white border-b-2 border-purple-500 text-purple-600 shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              UGC Ads
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* File Upload for Reels Tab */}
            {activeTab === 'reels' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-foreground">
                    Upload Image
                  </label>
                  {file && (
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Clear file"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted transition-colors group cursor-pointer relative">
                  <input 
                      type="file" 
                      required 
                      onChange={e => handleFileChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                  />
                  {filePreview ? (
                    <div className="space-y-3">
                      <img src={filePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                      <p className="text-sm text-muted-foreground">{file?.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                      <Upload size={32} />
                      <span className="text-sm font-medium">Click to upload image</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <label className="block text-sm font-bold text-foreground">
                   {activeTab === 'reels' ? 'AI Prompt Instructions' : 'Ad Instructions / Prompt'}
                 </label>
                 {prompt && (
                   <button
                     type="button"
                     onClick={() => setPrompt('')}
                     className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                     title="Clear prompt"
                   >
                     <X size={16} />
                   </button>
                 )}
               </div>
               <textarea 
                 required
                 className="w-full p-4 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-32 resize-none outline-none"
                 placeholder={activeTab === 'reels' ? "Describe what changes or enhancements you want..." : "Describe the product benefits and the vibe of the video..."}
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
               />
            </div>

            {/* Aspect Ratio - For ALL tabs */}
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
              <label className="block text-sm font-bold text-foreground">
                Choose Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAspectRatio('Portrait')}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    aspectRatio === 'Portrait'
                      ? 'border-primary bg-primary/10 text-primary shadow-medium'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  Portrait (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('Landscape')}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    aspectRatio === 'Landscape'
                      ? 'border-primary bg-primary/10 text-primary shadow-medium'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  Landscape (16:9)
                </button>
              </div>
            </div>

            {activeTab !== 'reels' && (
              <>
                {/* Product Name */}
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-foreground">
                      Product Name
                    </label>
                    {productName && (
                      <button
                        type="button"
                        onClick={() => setProductName('')}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear product name"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Enter product name..."
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                  />
                </div>

                {/* Product Description */}
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-foreground">
                      Product Description
                    </label>
                    {productDescription && (
                      <button
                        type="button"
                        onClick={() => setProductDescription('')}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear description"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <textarea 
                    required
                    className="w-full p-4 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-24 resize-none outline-none"
                    placeholder="Describe your product features and benefits..."
                    value={productDescription}
                    onChange={e => setProductDescription(e.target.value)}
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-foreground">
                       {activeTab === 'product' ? 'Product Image/Video' : 'UGC Raw Footage'}
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => handleFileChange(null)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear file"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted transition-colors group cursor-pointer relative">
                    <input 
                        type="file" 
                        required 
                        onChange={e => handleFileChange(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,video/*"
                    />
                    {filePreview ? (
                      <div className="space-y-3">
                        {file?.type.startsWith('image/') ? (
                          <img src={filePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                        ) : (
                          <video src={filePreview} className="max-h-48 mx-auto rounded-lg" controls />
                        )}
                        <p className="text-sm text-muted-foreground">{file?.name}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                        <Upload size={32} />
                        <span className="text-sm font-medium">Click to upload or drag and drop</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-large hover:shadow-xl transition-all flex justify-center items-center gap-3 transform active:scale-[0.99] 
                ${activeTab === 'reels' ? 'bg-gradient-pink' : 
                  activeTab === 'product' ? 'bg-gradient-blue' : 
                  'bg-gradient-purple'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <PlayCircle fill="currentColor" />}
              Generate {activeTab === 'reels' ? 'Reel' : 'Ad Campaign'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function SettingsView() {
    const [tempSettings, setTempSettings] = useState(settings);

    const handleSave = () => {
      setSettings(tempSettings);
      localStorage.setItem('appSettings', JSON.stringify(tempSettings));
      showNotification('success', 'Settings saved successfully!');
    };

    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-2">Configure your Supabase and n8n webhooks</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">Supabase URL</label>
            <input
              type="url"
              placeholder="https://xxxxx.supabase.co"
              value={tempSettings.supabaseUrl}
              onChange={e => setTempSettings({...tempSettings, supabaseUrl: e.target.value})}
              className="w-full p-3 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">Supabase Anon Key</label>
            <input
              type="password"
              placeholder="Your anon/public key"
              value={tempSettings.supabaseKey}
              onChange={e => setTempSettings({...tempSettings, supabaseKey: e.target.value})}
              className="w-full p-3 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">n8n Generate Video Webhook</label>
            <input
              type="url"
              placeholder="https://your-n8n-instance.app/webhook/generate"
              value={tempSettings.n8nGenerateWebhook}
              onChange={e => setTempSettings({...tempSettings, n8nGenerateWebhook: e.target.value})}
              className="w-full p-3 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">n8n Post to Socials Webhook</label>
            <input
              type="url"
              placeholder="https://your-n8n-instance.app/webhook/post-to-socials"
              value={tempSettings.n8nPostWebhook}
              onChange={e => setTempSettings({...tempSettings, n8nPostWebhook: e.target.value})}
              className="w-full p-3 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">Database Table Name</label>
            <input
              type="text"
              placeholder="video_posts"
              value={tempSettings.tableName}
              onChange={e => setTempSettings({...tempSettings, tableName: e.target.value})}
              className="w-full p-3 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-blue text-white font-bold rounded-xl shadow-medium hover:shadow-large transition-all flex justify-center items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Save Settings
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm text-blue-900">
            <strong>Important Setup Steps:</strong>
          </p>
          <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
            <li>Set your Supabase URL and Anon Key from your Supabase project settings</li>
            <li>Make sure your table name matches exactly (default: "social_media_videos")</li>
            <li><strong>Disable Row Level Security (RLS)</strong> on your table for testing, or create a policy that allows public read access:
              <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
ALTER TABLE social_media_videos DISABLE ROW LEVEL SECURITY;
              </pre>
            </li>
            <li>Configure n8n webhooks for video generation and posting</li>
          </ol>
        </div>
      </div>
    );
  }
};

export default Index;
