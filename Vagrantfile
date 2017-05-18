# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.


  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  config.vm.define "development", primary:true do |development|
	development.vm.box = "jhcook/fedora24"
	development.vm.provider "virtualbox" do |vb|
    
	vb.name = "openessence_development"
      vb.customize ['modifyvm', :id, '--cableconnected1', 'on']
      vb.memory = "4096"
    end

	config.vm.synced_folder ".", "/openessence"
	
	development.vm.network "forwarded_port", guest: 9000, host: 9000
    development.vm.network "forwarded_port", guest: 9200, host: 9200
    development.vm.network "forwarded_port", guest: 9300, host: 9300
    development.vm.network "forwarded_port", guest: 8080, host: 8080
    development.vm.network "forwarded_port", guest: 8443, host: 8443
    development.vm.network "forwarded_port", guest: 6379, host: 6379

  	config.vm.provision :shell, privileged:false, path: "vagrant/scripts/1_setup.sh"
  	config.vm.provision :shell, privileged:false, path: "vagrant/scripts/2_install.sh"
	  config.vm.provision :shell, privileged:false, path: "vagrant/scripts/3_setup_containers.sh"

  end
  
  config.vm.define "windows_development", autostart:false do |development|
	  development.vm.box = "bento/fedora-24"
	  development.vm.provider "virtualbox" do |vb|
    
	  vb.name = "openessence_development_windows"
      vb.customize ['modifyvm', :id, '--cableconnected1', 'on']
      vb.memory = "4096"
    end

	  config.vm.synced_folder ".", "/home/vagrant/openessence"
	
    development.vm.network "forwarded_port", guest: 9200, host: 9200
    development.vm.network "forwarded_port", guest: 9300, host: 9300
    development.vm.network "forwarded_port", guest: 8080, host: 8080
	  development.vm.network "forwarded_port", guest: 6379, host: 6379

    config.vm.provision :shell, privileged:false, path: "vagrant/scripts/1_setup_windows.sh"
    
	  config.vm.provision :shell, privileged:false, path: "vagrant/scripts/3_setup_containers_windows.sh"
  end

end