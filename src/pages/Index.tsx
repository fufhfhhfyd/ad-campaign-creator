import { useState, useEffect } from 'react';
import { Video, Settings as SettingsIcon, Plus, RefreshCw, Loader2, Send, Upload, PlayCircle, CheckCircle2 } from 'lucide-react';
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

  const handlePostToSocials = async (video: VideoPost) => {
    if (!settings.n8nPostWebhook) {
      showNotification('error', 'Please configure n8n post webhook in settings');
      return;
    }

    setLoading(true);
    try {
      await fetch(settings.n8nPostWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });
      
      showNotification('success', 'Post request sent to social platforms!');
      await fetchVideos();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
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
                
                {/* Video Player */}
                <div className="w-full md:w-1/3 flex-shrink-0 bg-slate-900 rounded-xl overflow-hidden relative aspect-[9/16] md:aspect-auto md:h-[400px]">
                  {video.video_url ? (
                    <video 
                      src={video.video_url} 
                      controls 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted">
                      <Loader2 className="w-10 h-10 animate-spin mb-2 text-primary" />
                      <span className="text-sm font-medium">Processing Video...</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-foreground leading-tight">
                        {video.post_title || 'Untitled Campaign'}
                      </h3>
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {video.hashtag ? 'Ad Campaign' : 'Social Post'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                      <p className="text-foreground text-sm leading-relaxed bg-muted p-4 rounded-lg border border-border max-h-32 overflow-y-auto">
                        {video.caption || 'No description generated yet.'}
                      </p>
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

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social Media Status</label>
                      <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-xs border border-border px-3 py-1.5 rounded-full bg-muted">
                              <div className={`w-2 h-2 rounded-full ${video.instagram_post_status === 'posted' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                              <span>Instagram: {video.instagram_post_status || 'Pending'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs border border-border px-3 py-1.5 rounded-full bg-muted">
                              <div className={`w-2 h-2 rounded-full ${video.facebook_post_status === 'posted' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                              <span>Facebook: {video.facebook_post_status || 'Pending'}</span>
                          </div>
                           <div className="flex items-center gap-2 text-xs border border-border px-3 py-1.5 rounded-full bg-muted">
                              <div className={`w-2 h-2 rounded-full ${video.youtube_post_status === 'posted' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                              <span>YouTube: {video.youtube_post_status || 'Pending'}</span>
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border">
                      <button 
                          onClick={() => handlePostToSocials(video)}
                          disabled={loading || !video.video_url}
                          className="w-full py-3 bg-gradient-pink text-white font-bold rounded-xl shadow-medium hover:shadow-large transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                          Post to Social Media
                      </button>
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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!settings.supabaseUrl || !settings.n8nGenerateWebhook) {
        showNotification('error', 'Please configure Settings first!');
        return;
      }

      setLoading(true);
      try {
        const supabase = getSupabase();
        let uploadedFileUrl = '';

        if (activeTab !== 'reels' && file && supabase) {
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('videos') 
                .upload(fileName, file);

            if (uploadError) throw new Error('Upload Failed: ' + uploadError.message);

            const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
            uploadedFileUrl = urlData.publicUrl;
        }

        const payload = {
            video_title: activeTab === 'reels' ? 'Facebook Reel Campaign' : 'Ad Campaign',
            post_caption: prompt, 
            video_url: null,
            file_url: uploadedFileUrl,
            youtube_post_status: 'pending',
            facebook_post_status: 'pending',
            instagram_post_status: 'pending'
        };

        if (supabase) {
            const { data, error } = await supabase
                .from(settings.tableName)
                .insert([payload])
                .select()
                .single();
            
            if (error) throw error;

            await fetch(settings.n8nGenerateWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...payload, 
                    id: data.id, 
                    type: activeTab,
                    prompt_text: prompt 
                }),
            });
            
            showNotification('success', 'Ad request sent successfully!');
            setPrompt('');
            setFile(null);
            setActiveView('dashboard');
        }

      } catch (err: any) {
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
              onClick={() => { setActiveTab('reels'); setFile(null); }}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'reels' ? 'bg-white border-b-2 border-accent text-accent shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Facebook Reels
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
            
            <div className="space-y-3">
               <label className="block text-sm font-bold text-foreground">
                 {activeTab === 'reels' ? 'Video Concept / Prompt' : 'Ad Instructions / Prompt'}
               </label>
               <textarea 
                 required
                 className="w-full p-4 border border-border rounded-xl bg-muted focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-32 resize-none outline-none"
                 placeholder={activeTab === 'reels' ? "Describe the viral reel you want to create..." : "Describe the product benefits and the vibe of the video..."}
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
               />
            </div>

            {activeTab !== 'reels' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                <label className="block text-sm font-bold text-foreground">
                   {activeTab === 'product' ? 'Product Image/Video' : 'UGC Raw Footage'}
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted transition-colors group cursor-pointer relative">
                  <input 
                      type="file" 
                      required 
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*,video/*"
                  />
                  <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                    <Upload size={32} />
                    <span className="text-sm font-medium">
                        {file ? file.name : "Click to upload or drag and drop"}
                    </span>
                  </div>
                </div>
              </div>
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
              placeholder="https://your-n8n-instance.app/webhook/post"
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
