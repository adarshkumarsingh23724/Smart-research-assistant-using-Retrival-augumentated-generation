import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const checkHealth = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/`);
        return response.data;
    } catch (error) {
        console.error("Health check failed:", error);
        throw error;
    }
};

export const fetchCourses = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/courses`);
        return response.data.courses;
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
};

export const syncCourse = async (courseId, force = false) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/sync`, null, {
            params: { force }
        });
        return response.data;
    } catch (error) {
        console.error("Error syncing course:", error);
        throw error;
    }
};

export const fetchCourseFiles = async (courseId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/files`);
        return response.data.embedded_files || [];
    } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
    }
};

export const ingestFile = async (courseId, fileName) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/courses/${courseId}/ingest-file`,
            null,
            { params: { file_name: fileName } }
        );
        return response.data;
    } catch (error) {
        console.error("Error ingesting file:", error);
        throw error;
    }
};

export const generateAssessment = async (courseId, payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/assessment`, payload);
        return response.data;
    } catch (error) {
        console.error("Error generating assessment:", error);
        throw error;
    }
};

export const uploadCourseFile = async (courseId, file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};


export const fetchSidebarData = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/sidebar-data`);
        return response.data.courses;
    } catch (error) {
        console.error("Error fetching sidebar data:", error);
        throw error;
    }
};

export const sendMessage = async (courseId, question, marks = 5) => {
    try {
        const payload = { question, marks };
        if (courseId) {
            payload.course_id = courseId;
        }
        const response = await axios.post(`${API_BASE_URL}/ask`, payload);
        return response.data;
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

export const askQuestion = sendMessage;

export const getCourseFileUrl = (courseId, fileName, inline = false) => {
    return `${API_BASE_URL}/api/courses/${courseId}/files/${encodeURIComponent(fileName)}${inline ? '?inline=true' : ''}`;
};

export const getCourseStream = async (courseId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/stream`);
        return response.data;
    } catch (error) {
        console.error("Error fetching course stream:", error);
        throw error;
    }
};

export const getCourseClasswork = async (courseId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/classwork`);
        return response.data;
    } catch (error) {
        console.error("Error fetching course classwork:", error);
        throw error;
    }
};

export const ingestDocument = async (formData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/ingest`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error ingesting document:", error);
        throw error;
    }
};

// --- Auth Endpoints ---
export const getAuthStatus = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/status`);
        return response.data;
    } catch (error) {
        console.error("Error fetching auth status:", error);
        return { authenticated: false };
    }
};

export const getLoginUrl = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/login`);
        return response.data.auth_url;
    } catch (error) {
        console.error("Error getting login url:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await axios.post(`${API_BASE_URL}/api/auth/logout`);
        return true;
    } catch (error) {
        console.error("Error logging out:", error);
        return false;
    }
};
