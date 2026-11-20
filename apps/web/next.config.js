/** @type {import('next').NextConfig} */
const nextConfig = {
	// Самодостаточная сборка для Docker-образа.
	output: 'standalone',
};

export default nextConfig;
