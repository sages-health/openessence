# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile to get Fracas running inside Docker containers inside a CoreOS VM.
# Adapted from https://github.com/coreos/coreos-vagrant
# See https://coreos.com/docs/running-coreos/platforms/vagrant for more information.

# Alpha's pretty stable, and the docs are better. Continuous delivery FTW!
$update_channel = "alpha"

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "coreos-%s" % $update_channel
  config.vm.box_version = ">= 308.0.1"
  config.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant.json" % $update_channel

  # This is copied from core-os-vagrant. It probably works, but is totally untested.
  config.vm.provider :vmware_fusion do |vb, override|
    override.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant_vmware_fusion.json" % $update_channel
  end

  config.vm.provider :virtualbox do |v|
    # On VirtualBox, we don't have guest additions or a functional vboxsf
    # in CoreOS, so tell Vagrant that so it can be smarter.
    v.check_guest_additions = false
    v.functional_vboxsf = false
  end

  if Vagrant.has_plugin?("vagrant-vbguest") then
    config.vbguest.auto_update = false
  end

  config.vm.define vm_name = "corefracas" do |config|
    config.vm.hostname = vm_name

    config.vm.provider :vmware_fusion do |vb|
      vb.gui = false
    end

    config.vm.provider :virtualbox do |vb|
      vb.gui = false
      vb.memory = 1024
      vb.cpus = 1 # We don't need >1, plus >1 gives a scary warning on host machines with 1 CPU

      # Set VirtualBox machine name. This means Vagrant will not append a timestamp to the VM name. This is more
      # user friendly and easier to document, at the cost of potential name conflicts.
      vb.name = "corefracas"
    end

    # This would be great if it worked, but VirtualBox doesn't accurately export the network interface to OVF.
    # Feel free to uncomment if you're just using the vagrant box locally, but know that the network interface isn't
    # always preserved when you export an appliance, and it causes a scary warning when you import an appliance.
    # See https://www.virtualbox.org/ticket/7067
    #config.vm.network :private_network, ip: "172.17.8.101"

    # Forwarding ports could lead to port conflicts when users import our appliance. Hopefully, they're not running
    # a copy of Rails. If it becomes an issue, we can use more obscure port numbers.
    config.vm.network :forwarded_port, :guest => 9000, :host => 9000

    # Expose elasticsearch to the host. Useful to seed data. TODO: this might be a security risk.
    config.vm.network :forwarded_port, :guest => 9200, :host => 9200

    # Uncomment this to port forward to guest's Docker
    #config.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true

    # If we used something like NFS, it
    # 1. wouldn't work on every host and 2. wouldn't persist across guest restarts without Vagrant remounting it
    config.vm.synced_folder ".", "/home/core/share", :type => "rsync",
        :rsync__exclude => [".vagrant", ".git", "node_modules"]

    CLOUD_CONFIG_PATH = File.join(File.dirname(__FILE__), "docker/user-data")
    if File.exists?(CLOUD_CONFIG_PATH)
      config.vm.provision :file, :source => "#{CLOUD_CONFIG_PATH}", :destination => "/tmp/vagrantfile-user-data"
      config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/",
                          :privileged => true
    end

    # We kill and remove the containers to make provisioning idempotent. Otherwise, `vagrant provision` would fail
    # if you already created any of the containers. The `|| true` is so that provisioning doesn't fail the first time,
    # when there's no containers and `docker kill` and `docker rm` return an error.
    #
    # Using fleetctl and service files means that our containers will start on boot, useful if the VM is ever stopped,
    # e.g. when it's exported. We could have used systemd directly instead of fleet, especially since on 1 node they're
    # basically equivalent, but the CoreOS docs tend to guide you towards using fleet. And with fleet we can be
    # web scale.

    # Data volume container for elasticsearch data. Otherwise, your data would get blown away every time you
    # restarted the elasticsearch container
    config.vm.provision :shell, :inline => "docker kill fracas-data || true"
    config.vm.provision :shell, :inline => "docker rm fracas-data || true"
    config.vm.provision :shell, :inline => "docker run --name fracas-data -v /data busybox true"

    # Provision elasticsearch
    config.vm.provision :shell, :inline => "docker kill elasticsearch || true"
    config.vm.provision :shell, :inline => "docker rm elasticsearch || true"
    config.vm.provision :shell, :inline => "docker build -t elasticsearch /home/core/share/docker/elasticsearch"
    config.vm.provision :shell, :inline => "fleetctl start /home/core/share/docker/elasticsearch/elasticsearch.service"

    # Provision redis
    config.vm.provision :shell, :inline => "docker kill redis || true"
    config.vm.provision :shell, :inline => "docker rm redis || true"
    config.vm.provision :shell, :inline => "docker build -t redis /home/core/share/docker/redis"
    config.vm.provision :shell, :inline => "fleetctl start /home/core/share/docker/redis/redis.service"

    # Provision fracas
    config.vm.provision :shell, :inline => "docker kill fracas || true"
    config.vm.provision :shell, :inline => "docker rm fracas || true"
    config.vm.provision :shell, :inline => "docker build -t fracas /home/core/share"
    config.vm.provision :shell, :inline => "fleetctl start /home/core/share/docker/fracas.service"
  end
end
